import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API } from '../App';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Pollution level colors and classification
const getPollutionColor = (score) => {
  if (score <= 30) return '#10b981'; // Green - Good
  if (score <= 50) return '#f59e0b'; // Yellow - Moderate
  if (score <= 70) return '#f97316'; // Orange - Unhealthy for Sensitive Groups
  return '#ef4444'; // Red - Unhealthy
};

const getPollutionLevel = (score) => {
  if (score <= 30) return 'Good';
  if (score <= 50) return 'Moderate'; 
  if (score <= 70) return 'Unhealthy for Sensitive';
  return 'Unhealthy';
};

const getRouteColor = (score) => {
  if (score <= 30) return '#10b981'; // Green
  if (score <= 50) return '#eab308'; // Yellow
  return '#ef4444'; // Red
};

// Custom icons for different marker types
const createCustomIcon = (color, type, size = 'medium') => {
  const iconSize = size === 'small' ? [20, 20] : size === 'large' ? [40, 40] : [30, 30];
  const anchor = size === 'small' ? [10, 10] : size === 'large' ? [20, 20] : [15, 15];
  
  let symbol = '';
  if (type === 'source') symbol = 'S';
  else if (type === 'destination') symbol = 'D';
  else if (type === 'intermediate') symbol = '●';
  else if (type === 'pollution') symbol = '⬤';
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: ${iconSize[0]}px;
        height: ${iconSize[1]}px;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size === 'small' ? '10px' : size === 'large' ? '16px' : '12px'};
        color: white;
        font-weight: bold;
      ">
        ${symbol}
      </div>
    `,
    iconSize: iconSize,
    iconAnchor: anchor,
  });
};

// Heatmap Component (simplified for demo - would use leaflet.heat in production)
const HeatmapLayer = ({ routes, opacity = 0.3 }) => {
  const map = useMap();
  const heatmapRef = useRef(null);

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    // Clear existing heatmap
    if (heatmapRef.current) {
      map.removeLayer(heatmapRef.current);
    }

    // Generate heatmap points from route data
    const heatPoints = [];
    routes.forEach(route => {
      if (route.waypoints) {
        route.waypoints.forEach(waypoint => {
          heatPoints.push([
            waypoint.lat,
            waypoint.lng,
            route.pollution_score / 100 // Normalize intensity
          ]);
        });
      }
    });

    // Create simple circle markers as heatmap approximation
    const heatmapGroup = L.layerGroup();
    heatPoints.forEach(point => {
      const circle = L.circle([point[0], point[1]], {
        radius: 5000,
        fillColor: getPollutionColor(point[2] * 100),
        color: getPollutionColor(point[2] * 100),
        weight: 0,
        fillOpacity: opacity,
      });
      heatmapGroup.addLayer(circle);
    });

    heatmapGroup.addTo(map);
    heatmapRef.current = heatmapGroup;

    return () => {
      if (heatmapRef.current) {
        map.removeLayer(heatmapRef.current);
      }
    };
  }, [map, routes, opacity]);

  return null;
};

// Pin Drop Component
const PinDropHandler = ({ onPinDrop }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      
      // Fetch pollution data for the clicked location
      try {
        const response = await fetch(`${API}/pollution/current?lat=${lat}&lng=${lng}`);
        if (response.ok) {
          const pollutionData = await response.json();
          onPinDrop({ lat, lng, pollutionData });
        }
      } catch (error) {
        console.error('Error fetching pollution data:', error);
      }
    },
  });

  return null;
};

// Map Controller Component
const MapController = ({ source, destination, selectedRoute }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedRoute && selectedRoute.waypoints && selectedRoute.waypoints.length > 0) {
      const bounds = L.latLngBounds(
        selectedRoute.waypoints.map(point => [point.lat, point.lng])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (source.lat && destination.lat) {
      const bounds = L.latLngBounds([
        [source.lat, source.lng],
        [destination.lat, destination.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (source.lat) {
      map.setView([source.lat, source.lng], 8);
    }
  }, [map, source, destination, selectedRoute]);

  return null;
};

// Main Enhanced Map Component
const EnhancedLeafletMap = ({ 
  source, 
  destination, 
  selectedRoute, 
  routes = [], 
  showHeatmap = true,
  enablePinDrop = true 
}) => {
  const [droppedPins, setDroppedPins] = useState([]);
  const [mapStyle, setMapStyle] = useState('default');
  
  const defaultCenter = [39.8283, -98.5795];
  const defaultZoom = 4;

  const handlePinDrop = (pinData) => {
    setDroppedPins(prev => [...prev, { ...pinData, id: Date.now() }]);
  };

  const removePinDrop = (id) => {
    setDroppedPins(prev => prev.filter(pin => pin.id !== id));
  };

  return (
    <div className="relative h-full w-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-1000 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <div className="text-xs font-semibold text-gray-700 mb-2">Map Options</div>
        
        <label className="flex items-center space-x-2 text-xs">
          <input
            type="checkbox"
            checked={showHeatmap}
            onChange={(e) => setMapStyle(e.target.checked ? 'heatmap' : 'default')}
            className="form-checkbox h-3 w-3 text-blue-600"
          />
          <span>Pollution Heatmap</span>
        </label>
        
        <label className="flex items-center space-x-2 text-xs">
          <input
            type="checkbox"
            checked={enablePinDrop}
            readOnly
            className="form-checkbox h-3 w-3 text-blue-600"
          />
          <span>Click to Check Pollution</span>
        </label>

        {droppedPins.length > 0 && (
          <button
            onClick={() => setDroppedPins([])}
            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
          >
            Clear Pins ({droppedPins.length})
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-1000 bg-white rounded-lg shadow-lg p-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">Pollution Levels</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Good (0-30)</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Moderate (31-50)</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Unhealthy for Sensitive (51-70)</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Unhealthy (71-100)</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          source={source} 
          destination={destination} 
          selectedRoute={selectedRoute}
        />

        {/* Heatmap Layer */}
        {showHeatmap && mapStyle === 'heatmap' && (
          <HeatmapLayer routes={routes} />
        )}

        {/* Pin Drop Handler */}
        {enablePinDrop && (
          <PinDropHandler onPinDrop={handlePinDrop} />
        )}

        {/* Source Marker */}
        {source.lat && source.lng && (
          <Marker
            position={[source.lat, source.lng]}
            icon={createCustomIcon('#2563eb', 'source', 'large')}
          >
            <Popup>
              <div className="text-center min-w-48">
                <h3 className="font-semibold text-blue-600 mb-2">🎯 Starting Point</h3>
                <p className="text-sm text-gray-700 font-medium">{source.address}</p>
                <p className="text-xs text-gray-500 mt-2">
                  📍 {source.lat.toFixed(4)}, {source.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination.lat && destination.lng && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={createCustomIcon('#dc2626', 'destination', 'large')}
          >
            <Popup>
              <div className="text-center min-w-48">
                <h3 className="font-semibold text-red-600 mb-2">🏁 Destination</h3>
                <p className="text-sm text-gray-700 font-medium">{destination.address}</p>
                <p className="text-xs text-gray-500 mt-2">
                  📍 {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Lines with Color Coding */}
        {routes.map((route, index) => {
          if (!route.waypoints || route.waypoints.length === 0) return null;
          
          const positions = route.waypoints.map(point => [point.lat, point.lng]);
          const routeColor = getRouteColor(route.pollution_score);
          const isSelected = selectedRoute && route.id === selectedRoute.id;
          
          return (
            <Polyline
              key={route.id}
              positions={positions}
              color={routeColor}
              opacity={isSelected ? 0.9 : 0.5}
              weight={isSelected ? 6 : 4}
            >
              <Popup>
                <div className="text-center min-w-64">
                  <h3 className="font-semibold mb-3 text-lg">{route.route_name}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div className="text-left">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium ml-2">{route.distance_km} km</span>
                    </div>
                    <div className="text-left">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium ml-2">{route.duration_minutes} min</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pollution Score:</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: routeColor }}
                        ></div>
                        <span className="font-medium text-sm">
                          {route.pollution_score}/100
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Level: {getPollutionLevel(route.pollution_score)}
                    </div>
                  </div>

                  {/* Intermediate Cities */}
                  {route.waypoint_details && route.waypoint_details.length > 2 && (
                    <div className="border-t pt-2 mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">Route via:</div>
                      <div className="text-xs text-gray-600">
                        {route.waypoint_details
                          .filter(w => w.type === 'intermediate')
                          .map(w => w.name)
                          .join(' → ')
                        }
                      </div>
                    </div>
                  )}

                  {/* Air Quality Breakdown */}
                  <div className="border-t pt-2 mb-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">Air Quality:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>NO₂: {route.pollutant_levels?.no2} ppb</div>
                      <div>O₃: {route.pollutant_levels?.o3} ppb</div>
                      <div>SO₂: {route.pollutant_levels?.so2} ppb</div>
                      <div>CO₂: {route.pollutant_levels?.co2} ppm</div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {route.recommendations && route.recommendations.length > 0 && (
                    <div className="border-t pt-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">Health Tips:</div>
                      <div className="text-xs text-gray-600 text-left">
                        {route.recommendations[0]}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Intermediate City Markers */}
        {selectedRoute && selectedRoute.waypoint_details && 
          selectedRoute.waypoint_details
            .filter(detail => detail.type === 'intermediate')
            .map((detail, index) => {
              const waypoint = selectedRoute.waypoints[index + 1]; // +1 because source is at index 0
              if (!waypoint || !detail.pollution_data) return null;

              const pollutionColor = getPollutionColor(detail.pollution_data.aqi || 50);
              
              return (
                <CircleMarker
                  key={`intermediate-${index}`}
                  center={[waypoint.lat, waypoint.lng]}
                  radius={8}
                  fillColor={pollutionColor}
                  color="white"
                  weight={2}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <div className="text-center min-w-48">
                      <h4 className="font-semibold text-sm mb-2">🏙️ {detail.name}</h4>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span>AQI:</span>
                          <span className="font-medium">{Math.round(detail.pollution_data.aqi || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Level:</span>
                          <span className="font-medium" style={{ color: pollutionColor }}>
                            {getPollutionLevel(detail.pollution_data.aqi || 0)}
                          </span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div>NO₂: {detail.pollution_data.no2}</div>
                            <div>O₃: {detail.pollution_data.o3}</div>
                            <div>SO₂: {detail.pollution_data.so2}</div>
                            <div>CO₂: {detail.pollution_data.co2}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
        }

        {/* Dropped Pin Markers */}
        {droppedPins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createCustomIcon(getPollutionColor(pin.pollutionData.aqi), 'pollution')}
          >
            <Popup>
              <div className="text-center min-w-48">
                <h4 className="font-semibold text-sm mb-2">📍 Pollution Check</h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span>AQI Score:</span>
                    <span 
                      className="font-medium px-2 py-1 rounded text-white"
                      style={{ backgroundColor: getPollutionColor(pin.pollutionData.aqi) }}
                    >
                      {Math.round(pin.pollutionData.aqi)}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    Level: {getPollutionLevel(pin.pollutionData.aqi)}
                  </div>

                  <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>NO₂: {pin.pollutionData.no2} ppb</div>
                      <div>O₃: {pin.pollutionData.o3} ppb</div>
                      <div>SO₂: {pin.pollutionData.so2} ppb</div>
                      <div>CO₂: {pin.pollutionData.co2} ppm</div>
                    </div>
                  </div>

                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-gray-500">
                      📍 {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                    </p>
                    <button
                      onClick={() => removePinDrop(pin.id)}
                      className="text-xs text-red-600 hover:text-red-800 mt-1"
                    >
                      Remove Pin
                    </button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default EnhancedLeafletMap;