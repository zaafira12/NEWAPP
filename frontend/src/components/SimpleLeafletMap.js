import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Simple map controller
const MapController = ({ source, destination, selectedRoute }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedRoute && selectedRoute.waypoints && selectedRoute.waypoints.length > 0) {
      const bounds = L.latLngBounds(
        selectedRoute.waypoints.map(point => [point.lat, point.lng])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (source.lat && destination.lat) {
      const bounds = L.latLngBounds([
        [source.lat, source.lng],
        [destination.lat, destination.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (source.lat) {
      map.setView([source.lat, source.lng], 10);
    }
  }, [map, source, destination, selectedRoute]);

  return null;
};

const SimpleLeafletMap = ({ source, destination, selectedRoute, routes = [] }) => {
  const defaultCenter = [39.8283, -98.5795];
  const defaultZoom = 4;

  const getRouteColor = (route, index) => {
    if (selectedRoute && route.id === selectedRoute.id) {
      return '#2563eb';
    }
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  };

  const getRouteOpacity = (route) => {
    return selectedRoute && route.id === selectedRoute.id ? 0.8 : 0.4;
  };

  const getRouteWeight = (route) => {
    return selectedRoute && route.id === selectedRoute.id ? 5 : 3;
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
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

        {/* Source Marker */}
        {source.lat && source.lng && (
          <Marker position={[source.lat, source.lng]}>
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold text-blue-600 mb-1">Starting Point</h3>
                <p className="text-sm text-gray-600">{source.address}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {source.lat.toFixed(4)}, {source.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination.lat && destination.lng && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold text-red-600 mb-1">Destination</h3>
                <p className="text-sm text-gray-600">{destination.address}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Lines */}
        {routes.map((route, index) => {
          if (!route.waypoints || route.waypoints.length === 0) return null;
          
          const positions = route.waypoints.map(point => [point.lat, point.lng]);
          
          return (
            <Polyline
              key={route.id}
              positions={positions}
              color={getRouteColor(route, index)}
              opacity={getRouteOpacity(route)}
              weight={getRouteWeight(route)}
            >
              <Popup>
                <div className="text-center min-w-48">
                  <h3 className="font-semibold mb-2">{route.route_name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Distance:</span>
                      <span className="font-medium">{route.distance_km} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{route.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pollution Score:</span>
                      <span className={`font-medium ${
                        route.pollution_score <= 30 ? 'text-green-600' :
                        route.pollution_score <= 50 ? 'text-yellow-600' :
                        route.pollution_score <= 70 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {route.pollution_score}/100
                      </span>
                    </div>
                  </div>
                  {route.recommendations && route.recommendations.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-600 font-medium mb-1">Key Recommendation:</p>
                      <p className="text-xs text-gray-700">
                        {route.recommendations[0]}
                      </p>
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default SimpleLeafletMap;