from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import aiohttp
import asyncio
from requests.auth import HTTPBasicAuth
import requests
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Clean Air Routes API", description="NASA TEMPO Air Quality Route Planning")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Location(BaseModel):
    lat: float
    lng: float
    address: str

class PollutantData(BaseModel):
    no2: Optional[float] = None
    o3: Optional[float] = None
    so2: Optional[float] = None
    co2: Optional[float] = None
    methane: Optional[float] = None
    aqi: Optional[float] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RouteRequest(BaseModel):
    source: Location
    destination: Location
    preferences: Optional[Dict[str, Any]] = {}

class RouteOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    route_name: str
    distance_km: float
    duration_minutes: float
    pollution_score: float  # 0-100, lower is better
    waypoints: List[Dict[str, float]]  # List of {lat, lng} coordinates
    pollutant_levels: Dict[str, float]  # Average pollutant levels along route
    recommendations: List[str]

class RouteResponse(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: Location
    destination: Location
    routes: List[RouteOption]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SavedRoute(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    route_name: str
    source: Location
    destination: Location
    selected_route: RouteOption
    alerts_enabled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PollutionAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    route_id: str
    alert_type: str  # 'high_pollution', 'extreme_pollution', 'health_warning'
    message: str
    severity: str  # 'low', 'medium', 'high', 'extreme'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# NASA TEMPO API Configuration
NASA_CMR_BASE_URL = "https://cmr.earthdata.nasa.gov/search"
TEMPO_COLLECTION_CONCEPT_ID = "C2823169910-LARC_CLOUD"  # Example concept ID for TEMPO

# Simulated NASA TEMPO data fetcher (for demo purposes)
# In production, you would use real NASA Earthdata credentials and API
async def fetch_tempo_data(lat: float, lng: float) -> PollutantData:
    """
    Fetch real-time pollution data from NASA TEMPO satellite.
    This is a simplified simulation for demo purposes.
    """
    try:
        # Simulate realistic pollutant values with some variation based on location
        import random
        
        # Base pollution levels with geographic variation
        base_no2 = max(5.0, 15.0 + random.uniform(-8, 12) + (abs(lat - 40) * 0.5))
        base_o3 = max(10.0, 35.0 + random.uniform(-15, 25))
        base_so2 = max(1.0, 8.0 + random.uniform(-4, 8))
        base_co2 = max(380.0, 410.0 + random.uniform(-20, 30))
        base_methane = max(1.8, 1.9 + random.uniform(-0.2, 0.3))
        
        # Calculate AQI based on pollutant levels
        aqi = min(500, max(0, (base_no2 * 2.5) + (base_o3 * 1.2) + (base_so2 * 5.0)))
        
        return PollutantData(
            no2=round(base_no2, 2),
            o3=round(base_o3, 2),
            so2=round(base_so2, 2),
            co2=round(base_co2, 2),
            methane=round(base_methane, 3),
            aqi=round(aqi, 1)
        )
    except Exception as e:
        logging.error(f"Error fetching TEMPO data: {e}")
        # Return default values if API fails
        return PollutantData(
            no2=12.5,
            o3=32.0,
            so2=5.5,
            co2=415.0,
            methane=1.85,
            aqi=65.0
        )

# US Cities data for realistic intermediate waypoints
US_CITIES = {
    'New York, NY': {'lat': 40.7128, 'lng': -74.0060, 'state': 'NY'},
    'Los Angeles, CA': {'lat': 34.0522, 'lng': -118.2437, 'state': 'CA'},
    'Chicago, IL': {'lat': 41.8781, 'lng': -87.6298, 'state': 'IL'},
    'Houston, TX': {'lat': 29.7604, 'lng': -95.3698, 'state': 'TX'},
    'Phoenix, AZ': {'lat': 33.4484, 'lng': -112.0740, 'state': 'AZ'},
    'Philadelphia, PA': {'lat': 39.9526, 'lng': -75.1652, 'state': 'PA'},
    'San Antonio, TX': {'lat': 29.4241, 'lng': -98.4936, 'state': 'TX'},
    'San Diego, CA': {'lat': 32.7157, 'lng': -117.1611, 'state': 'CA'},
    'Dallas, TX': {'lat': 32.7767, 'lng': -96.7970, 'state': 'TX'},
    'San Jose, CA': {'lat': 37.3382, 'lng': -121.8863, 'state': 'CA'},
    'Denver, CO': {'lat': 39.7392, 'lng': -104.9903, 'state': 'CO'},
    'Las Vegas, NV': {'lat': 36.1699, 'lng': -115.1398, 'state': 'NV'},
    'Oklahoma City, OK': {'lat': 35.4676, 'lng': -97.5164, 'state': 'OK'},
    'Albuquerque, NM': {'lat': 35.0844, 'lng': -106.6504, 'state': 'NM'},
    'Kansas City, MO': {'lat': 39.0997, 'lng': -94.5786, 'state': 'MO'},
    'St. Louis, MO': {'lat': 38.6270, 'lng': -90.1994, 'state': 'MO'},
    'Nashville, TN': {'lat': 36.1627, 'lng': -86.7816, 'state': 'TN'},
    'Atlanta, GA': {'lat': 33.7490, 'lng': -84.3880, 'state': 'GA'},
    'Indianapolis, IN': {'lat': 39.7684, 'lng': -86.1581, 'state': 'IN'},
    'Columbus, OH': {'lat': 39.9612, 'lng': -82.9988, 'state': 'OH'}
}

def find_intermediate_cities(source_lat, source_lng, dest_lat, dest_lng, route_type):
    """Find realistic intermediate cities along the route"""
    intermediate_cities = []
    
    # Calculate route bounds
    min_lat, max_lat = min(source_lat, dest_lat), max(source_lat, dest_lat)
    min_lng, max_lng = min(source_lng, dest_lng), max(source_lng, dest_lng)
    
    # Expand bounds slightly
    lat_margin = (max_lat - min_lat) * 0.3
    lng_margin = (max_lng - min_lng) * 0.3
    
    # Find cities within the route corridor
    for city_name, coords in US_CITIES.items():
        lat, lng = coords['lat'], coords['lng']
        
        # Check if city is in the route corridor
        if (min_lat - lat_margin <= lat <= max_lat + lat_margin and
            min_lng - lng_margin <= lng <= max_lng + lng_margin):
            
            # Calculate distance from the direct route line
            # Simple approximation for demo purposes
            route_distance = ((dest_lat - source_lat) * (lat - source_lat) + 
                            (dest_lng - source_lng) * (lng - source_lng)) / \
                           ((dest_lat - source_lat)**2 + (dest_lng - source_lng)**2)
            
            if 0.1 <= route_distance <= 0.9:  # Not too close to endpoints
                intermediate_cities.append({
                    'name': city_name,
                    'lat': lat,
                    'lng': lng,
                    'state': coords['state'],
                    'route_position': route_distance
                })
    
    # Sort by position along route
    intermediate_cities.sort(key=lambda x: x['route_position'])
    
    # Limit to 2-4 cities depending on route type
    if route_type == "Fastest Route":
        return intermediate_cities[:2]  # Fewer stops
    elif route_type == "Cleanest Air Route":
        return intermediate_cities[:4]  # More stops for cleaner path
    else:
        return intermediate_cities[:3]  # Balanced

# Enhanced route calculation with pollution scoring
async def calculate_routes_with_pollution(source: Location, destination: Location) -> List[RouteOption]:
    """
    Calculate multiple route options with detailed pollution scoring and intermediate cities.
    """
    routes = []
    
    # Generate 3 different route options
    route_configs = [
        {"name": "Fastest Route", "pollution_multiplier": 1.2, "distance_multiplier": 1.0},
        {"name": "Cleanest Air Route", "pollution_multiplier": 0.6, "distance_multiplier": 1.15},
        {"name": "Balanced Route", "pollution_multiplier": 0.8, "distance_multiplier": 1.08}
    ]
    
    for config in route_configs:
        name = config["name"]
        
        # Find intermediate cities
        intermediate_cities = find_intermediate_cities(
            source.lat, source.lng, destination.lat, destination.lng, name
        )
        
        # Create waypoints including intermediate cities
        waypoints = []
        waypoint_details = []
        
        # Add source
        waypoints.append({"lat": source.lat, "lng": source.lng})
        waypoint_details.append({
            "name": source.address,
            "type": "source",
            "pollution_data": None
        })
        
        # Add intermediate cities
        for city in intermediate_cities:
            # Add slight variation for different routes
            variation = random.uniform(-0.05, 0.05) if "Fastest" not in name else 0
            waypoints.append({
                "lat": city['lat'] + variation, 
                "lng": city['lng'] + variation
            })
            waypoint_details.append({
                "name": city['name'],
                "type": "intermediate",
                "state": city['state'],
                "pollution_data": None
            })
        
        # Add destination
        waypoints.append({"lat": destination.lat, "lng": destination.lng})
        waypoint_details.append({
            "name": destination.address,
            "type": "destination",
            "pollution_data": None
        })
        
        # Calculate pollution along route
        pollution_samples = []
        for i, waypoint in enumerate(waypoints):
            pollution_data = await fetch_tempo_data(waypoint["lat"], waypoint["lng"])
            pollution_samples.append(pollution_data)
            waypoint_details[i]["pollution_data"] = pollution_data
        
        # Calculate average pollution levels
        avg_no2 = sum(p.no2 for p in pollution_samples if p.no2) / len(pollution_samples)
        avg_o3 = sum(p.o3 for p in pollution_samples if p.o3) / len(pollution_samples)
        avg_so2 = sum(p.so2 for p in pollution_samples if p.so2) / len(pollution_samples)
        avg_co2 = sum(p.co2 for p in pollution_samples if p.co2) / len(pollution_samples)
        avg_methane = sum(p.methane for p in pollution_samples if p.methane) / len(pollution_samples)
        
        # Enhanced pollution score calculation (0-100, lower is better)
        base_score = (avg_no2 * 2.0) + (avg_o3 * 1.5) + (avg_so2 * 4.0) + ((avg_co2 - 400) * 0.1)
        pollution_score = min(100, max(0, base_score * config["pollution_multiplier"]))
        
        # Calculate distance
        total_distance = 0
        for i in range(len(waypoints) - 1):
            lat1, lng1 = waypoints[i]["lat"], waypoints[i]["lng"]
            lat2, lng2 = waypoints[i + 1]["lat"], waypoints[i + 1]["lng"]
            segment_distance = 111 * ((lat2 - lat1)**2 + (lng2 - lng1)**2)**0.5
            total_distance += segment_distance
        
        distance = round(total_distance * config["distance_multiplier"], 1)
        duration = round(distance * 1.3, 0)  # Assuming ~45 km/h average with stops
        
        # Generate enhanced recommendations
        recommendations = []
        if pollution_score > 70:
            recommendations.extend([
                "🚨 High pollution detected: Wear N95 mask recommended",
                "🚗 Keep windows closed, use recirculated air",
                "⚠️ Avoid outdoor exercise along this route",
                "🌅 Consider traveling during early morning hours"
            ])
        elif pollution_score > 50:
            recommendations.extend([
                "⚠️ Moderate pollution: Sensitive individuals take precautions", 
                "🏥 Not recommended for those with respiratory conditions",
                "😷 Light mask recommended for extended exposure"
            ])
        else:
            recommendations.extend([
                "✅ Good air quality along this route",
                "🌿 Safe for outdoor activities and exercise"
            ])
        
        # Add specific pollutant warnings
        if avg_no2 > 25:
            recommendations.append("🚗 High NO₂: Avoid rush hour traffic (7-9 AM, 5-7 PM)")
        if avg_o3 > 60:
            recommendations.append("☀️ High ozone: Best to travel before 10 AM or after 7 PM")
        if avg_so2 > 10:
            recommendations.append("🏭 High SO₂ detected: Avoid industrial areas")
        
        route = RouteOption(
            route_name=name,
            distance_km=distance,
            duration_minutes=duration,
            pollution_score=round(pollution_score, 1),
            waypoints=waypoints,
            pollutant_levels={
                "no2": round(avg_no2, 2),
                "o3": round(avg_o3, 2),
                "so2": round(avg_so2, 2),
                "co2": round(avg_co2, 2),
                "methane": round(avg_methane, 3)
            },
            recommendations=recommendations
        )
        
        # Add waypoint details as additional data
        route.waypoint_details = waypoint_details
        
        routes.append(route)
    
    # Sort by pollution score (cleanest first)
    routes.sort(key=lambda r: r.pollution_score)
    
    return routes

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Clean Air Routes API - NASA TEMPO Pollution Monitoring"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

@api_router.post("/routes/calculate", response_model=RouteResponse)
async def calculate_routes(request: RouteRequest):
    """
    Calculate route options with pollution analysis
    """
    try:
        routes = await calculate_routes_with_pollution(request.source, request.destination)
        
        response = RouteResponse(
            source=request.source,
            destination=request.destination,
            routes=routes
        )
        
        return response
    except Exception as e:
        logging.error(f"Error calculating routes: {e}")
        raise HTTPException(status_code=500, detail="Error calculating routes")

@api_router.get("/pollution/current")
async def get_current_pollution(lat: float, lng: float):
    """
    Get current pollution data for a specific location
    """
    try:
        pollution_data = await fetch_tempo_data(lat, lng)
        return pollution_data
    except Exception as e:
        logging.error(f"Error fetching pollution data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching pollution data")

@api_router.get("/pollution/heatmap")
async def get_pollution_heatmap(bounds: str):
    """
    Get pollution heatmap data for a geographical area
    Format: bounds = "lat1,lng1,lat2,lng2"
    """
    try:
        # Parse bounds
        coords = [float(x) for x in bounds.split(',')]
        lat1, lng1, lat2, lng2 = coords
        
        # Generate grid of pollution data points
        heatmap_data = []
        grid_size = 10  # 10x10 grid
        
        for i in range(grid_size):
            for j in range(grid_size):
                lat = lat1 + (lat2 - lat1) * i / (grid_size - 1)
                lng = lng1 + (lng2 - lng1) * j / (grid_size - 1)
                
                pollution_data = await fetch_tempo_data(lat, lng)
                heatmap_data.append({
                    "lat": lat,
                    "lng": lng,
                    "intensity": pollution_data.aqi / 100,  # Normalize to 0-1
                    "pollutants": {
                        "no2": pollution_data.no2,
                        "o3": pollution_data.o3,
                        "so2": pollution_data.so2,
                        "co2": pollution_data.co2,
                        "methane": pollution_data.methane
                    }
                })
        
        return {"heatmap_points": heatmap_data}
    except Exception as e:
        logging.error(f"Error generating heatmap data: {e}")
        raise HTTPException(status_code=500, detail="Error generating heatmap data")

@api_router.post("/routes/save", response_model=SavedRoute)
async def save_route(saved_route: SavedRoute):
    """
    Save a route for bookmarking
    """
    try:
        route_dict = saved_route.dict()
        await db.saved_routes.insert_one(route_dict)
        return saved_route
    except Exception as e:
        logging.error(f"Error saving route: {e}")
        raise HTTPException(status_code=500, detail="Error saving route")

@api_router.get("/routes/saved/{user_id}", response_model=List[SavedRoute])
async def get_saved_routes(user_id: str):
    """
    Get all saved routes for a user
    """
    try:
        routes = await db.saved_routes.find({"user_id": user_id}).to_list(100)
        return [SavedRoute(**route) for route in routes]
    except Exception as e:
        logging.error(f"Error fetching saved routes: {e}")
        raise HTTPException(status_code=500, detail="Error fetching saved routes")

@api_router.delete("/routes/saved/{route_id}")
async def delete_saved_route(route_id: str):
    """
    Delete a saved route
    """
    try:
        result = await db.saved_routes.delete_one({"id": route_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Route not found")
        return {"message": "Route deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting route: {e}")
        raise HTTPException(status_code=500, detail="Error deleting route")

@api_router.get("/alerts/{user_id}", response_model=List[PollutionAlert])
async def get_pollution_alerts(user_id: str):
    """
    Get pollution alerts for user's saved routes
    """
    try:
        # Get user's saved routes with alerts enabled
        saved_routes = await db.saved_routes.find({
            "user_id": user_id,
            "alerts_enabled": True
        }).to_list(100)
        
        alerts = []
        for route in saved_routes:
            # Check pollution levels for each route
            pollution_data = await fetch_tempo_data(
                route["source"]["lat"],
                route["source"]["lng"]
            )
            
            # Generate alerts based on pollution levels
            if pollution_data.aqi and pollution_data.aqi > 100:
                severity = "high" if pollution_data.aqi < 150 else "extreme"
                alert = PollutionAlert(
                    route_id=route["id"],
                    alert_type="high_pollution",
                    message=f"High pollution alert for route '{route['route_name']}' - AQI: {pollution_data.aqi}",
                    severity=severity
                )
                alerts.append(alert)
        
        return alerts
    except Exception as e:
        logging.error(f"Error fetching alerts: {e}")
        raise HTTPException(status_code=500, detail="Error fetching alerts")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import random  # Add this import for the simulation