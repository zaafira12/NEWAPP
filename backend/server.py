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

# Route calculation with pollution scoring
async def calculate_routes_with_pollution(source: Location, destination: Location) -> List[RouteOption]:
    """
    Calculate multiple route options with pollution scoring.
    """
    routes = []
    
    # Generate 3 different route options
    route_names = ["Fastest Route", "Cleanest Air Route", "Balanced Route"]
    
    for i, name in enumerate(route_names):
        # Simulate route waypoints
        lat_diff = destination.lat - source.lat
        lng_diff = destination.lng - source.lng
        
        waypoints = []
        num_points = 5
        
        for j in range(num_points + 1):
            progress = j / num_points
            # Add some variation for different routes
            lat_offset = lat_diff * progress + (random.uniform(-0.01, 0.01) * i)
            lng_offset = lng_diff * progress + (random.uniform(-0.01, 0.01) * i)
            
            waypoint_lat = source.lat + lat_offset
            waypoint_lng = source.lng + lng_offset
            waypoints.append({"lat": waypoint_lat, "lng": waypoint_lng})
        
        # Calculate pollution along route
        pollution_samples = []
        for waypoint in waypoints:
            pollution_data = await fetch_tempo_data(waypoint["lat"], waypoint["lng"])
            pollution_samples.append(pollution_data)
        
        # Average pollution levels
        avg_no2 = sum(p.no2 for p in pollution_samples if p.no2) / len(pollution_samples)
        avg_o3 = sum(p.o3 for p in pollution_samples if p.o3) / len(pollution_samples)
        avg_so2 = sum(p.so2 for p in pollution_samples if p.so2) / len(pollution_samples)
        avg_co2 = sum(p.co2 for p in pollution_samples if p.co2) / len(pollution_samples)
        avg_methane = sum(p.methane for p in pollution_samples if p.methane) / len(pollution_samples)
        
        # Calculate pollution score (0-100, lower is better)
        pollution_score = min(100, max(0, 
            (avg_no2 * 2.0) + (avg_o3 * 1.5) + (avg_so2 * 4.0) + ((avg_co2 - 400) * 0.1)
        ))
        
        # Adjust route characteristics based on type
        if "Fastest" in name:
            distance = round(111 * ((lat_diff**2 + lng_diff**2)**0.5), 1)
            duration = round(distance * 1.2, 0)  # Assuming 50 km/h average
            pollution_score *= 1.1  # Slightly higher pollution
        elif "Cleanest" in name:
            distance = round(111 * ((lat_diff**2 + lng_diff**2)**0.5) * 1.15, 1)
            duration = round(distance * 1.5, 0)
            pollution_score *= 0.7  # Lower pollution
        else:  # Balanced
            distance = round(111 * ((lat_diff**2 + lng_diff**2)**0.5) * 1.08, 1)
            duration = round(distance * 1.35, 0)
            pollution_score *= 0.9
        
        # Generate recommendations based on pollution levels
        recommendations = []
        if pollution_score > 70:
            recommendations.extend([
                "High pollution detected: Consider wearing an N95 mask",
                "Avoid outdoor exercise along this route",
                "Keep windows closed if driving"
            ])
        elif pollution_score > 50:
            recommendations.extend([
                "Moderate pollution: Sensitive individuals should take precautions",
                "Consider alternative route if you have respiratory conditions"
            ])
        else:
            recommendations.append("Good air quality along this route")
        
        if avg_no2 > 20:
            recommendations.append("High NO2 levels: Avoid peak traffic hours")
        if avg_o3 > 50:
            recommendations.append("High ozone levels: Best to travel in early morning or evening")
        
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