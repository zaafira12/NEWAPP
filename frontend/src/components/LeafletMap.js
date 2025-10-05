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

// Custom icons for source and destination
const createCustomIcon = (color, type) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        font-weight: bold;
      ">
        ${type === 'source' ? 'S' : 'D'}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Pollution marker icon
const createPollutionIcon = (score) => {
  let color = '#10b981'; // green - good
  if (score > 30) color = '#f59e0b'; // yellow - moderate
  if (score > 50) color = '#ef4444'; // red - unhealthy
  if (score > 70) color = '#8b5cf6'; // purple - hazardous

  return L.divIcon({
    className: 'pollution-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 16px;
        height: 16px;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Component to handle map centering and bounds
const MapController = ({ source, destination, selectedRoute }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedRoute && selectedRoute.waypoints.length > 0) {
      // Fit map to show the entire route
      const bounds = L.latLngBounds(
        selectedRoute.waypoints.map(point => [point.lat, point.lng])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (source.lat && destination.lat) {
      // Fit map to show source and destination
      const bounds = L.latLngBounds([
        [source.lat, source.lng],
        [destination.lat, destination.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (source.lat) {
      // Center on source
      map.setView([source.lat, source.lng], 10);
    }
  }, [map, source, destination, selectedRoute]);

  return null;
};

const LeafletMap = ({ source, destination, selectedRoute, routes = [] }) => {
  // Default center (US center)
  const defaultCenter = [39.8283, -98.5795];
  const defaultZoom = 4;\n\n  // Get route colors\n  const getRouteColor = (route, index) => {\n    if (selectedRoute && route.id === selectedRoute.id) {\n      return '#2563eb'; // blue for selected route\n    }\n    \n    // Different colors for different routes\n    const colors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];\n    return colors[index % colors.length];\n  };\n\n  // Get route opacity\n  const getRouteOpacity = (route) => {\n    if (selectedRoute && route.id === selectedRoute.id) {\n      return 0.8;\n    }\n    return 0.4;\n  };\n\n  // Get route weight\n  const getRouteWeight = (route) => {\n    if (selectedRoute && route.id === selectedRoute.id) {\n      return 5;\n    }\n    return 3;\n  };\n\n  return (\n    <div style={{ height: '100%', width: '100%' }}>\n      <MapContainer\n        center={defaultCenter}\n        zoom={defaultZoom}\n        style={{ height: '100%', width: '100%' }}\n        scrollWheelZoom={true}\n      >\n        <TileLayer\n          attribution='&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors'\n          url=\"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png\"\n        />\n        \n        <MapController \n          source={source} \n          destination={destination} \n          selectedRoute={selectedRoute}\n        />\n\n        {/* Source Marker */}\n        {source.lat && source.lng && (\n          <Marker\n            position={[source.lat, source.lng]}\n            icon={createCustomIcon('#2563eb', 'source')}\n          >\n            <Popup>\n              <div className=\"text-center\">\n                <h3 className=\"font-semibold text-blue-600 mb-1\">Starting Point</h3>\n                <p className=\"text-sm text-gray-600\">{source.address}</p>\n                <p className=\"text-xs text-gray-500 mt-1\">\n                  {source.lat.toFixed(4)}, {source.lng.toFixed(4)}\n                </p>\n              </div>\n            </Popup>\n          </Marker>\n        )}\n\n        {/* Destination Marker */}\n        {destination.lat && destination.lng && (\n          <Marker\n            position={[destination.lat, destination.lng]}\n            icon={createCustomIcon('#dc2626', 'destination')}\n          >\n            <Popup>\n              <div className=\"text-center\">\n                <h3 className=\"font-semibold text-red-600 mb-1\">Destination</h3>\n                <p className=\"text-sm text-gray-600\">{destination.address}</p>\n                <p className=\"text-xs text-gray-500 mt-1\">\n                  {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}\n                </p>\n              </div>\n            </Popup>\n          </Marker>\n        )}\n\n        {/* Route Lines */}\n        {routes.map((route, index) => {\n          if (!route.waypoints || route.waypoints.length === 0) return null;\n          \n          const positions = route.waypoints.map(point => [point.lat, point.lng]);\n          \n          return (\n            <Polyline\n              key={route.id}\n              positions={positions}\n              color={getRouteColor(route, index)}\n              opacity={getRouteOpacity(route)}\n              weight={getRouteWeight(route)}\n            >\n              <Popup>\n                <div className=\"text-center min-w-48\">\n                  <h3 className=\"font-semibold mb-2\">{route.route_name}</h3>\n                  <div className=\"space-y-1 text-sm\">\n                    <div className=\"flex justify-between\">\n                      <span>Distance:</span>\n                      <span className=\"font-medium\">{route.distance_km} km</span>\n                    </div>\n                    <div className=\"flex justify-between\">\n                      <span>Duration:</span>\n                      <span className=\"font-medium\">{route.duration_minutes} min</span>\n                    </div>\n                    <div className=\"flex justify-between\">\n                      <span>Pollution Score:</span>\n                      <span className={`font-medium ${\n                        route.pollution_score <= 30 ? 'text-green-600' :\n                        route.pollution_score <= 50 ? 'text-yellow-600' :\n                        route.pollution_score <= 70 ? 'text-orange-600' : 'text-red-600'\n                      }`}>\n                        {route.pollution_score}/100\n                      </span>\n                    </div>\n                  </div>\n                  {route.recommendations.length > 0 && (\n                    <div className=\"mt-2 pt-2 border-t\">\n                      <p className=\"text-xs text-gray-600 font-medium mb-1\">Key Recommendation:</p>\n                      <p className=\"text-xs text-gray-700\">\n                        {route.recommendations[0]}\n                      </p>\n                    </div>\n                  )}\n                </div>\n              </Popup>\n            </Polyline>\n          );\n        })}\n\n        {/* Pollution markers along selected route */}\n        {selectedRoute && selectedRoute.waypoints && selectedRoute.waypoints.length > 0 && (\n          selectedRoute.waypoints.map((waypoint, index) => {\n            // Only show pollution markers for every 2nd waypoint to avoid clutter\n            if (index === 0 || index === selectedRoute.waypoints.length - 1 || index % 2 !== 0) {\n              return null;\n            }\n            \n            return (\n              <Marker\n                key={`pollution-${index}`}\n                position={[waypoint.lat, waypoint.lng]}\n                icon={createPollutionIcon(selectedRoute.pollution_score)}\n              >\n                <Popup>\n                  <div className=\"text-center\">\n                    <h4 className=\"font-semibold text-sm mb-1\">Air Quality Point</h4>\n                    <p className=\"text-xs text-gray-600 mb-2\">\n                      Pollution Score: {selectedRoute.pollution_score}\n                    </p>\n                    <div className=\"text-xs space-y-1\">\n                      {Object.entries(selectedRoute.pollutant_levels).map(([pollutant, level]) => (\n                        <div key={pollutant} className=\"flex justify-between\">\n                          <span className=\"uppercase font-medium\">{pollutant}:</span>\n                          <span>{level} {pollutant === 'co2' ? 'ppm' : 'ppb'}</span>\n                        </div>\n                      ))}\n                    </div>\n                  </div>\n                </Popup>\n              </Marker>\n            );\n          })\n        )}\n      </MapContainer>\n    </div>\n  );\n};\n\nexport default LeafletMap;"}, {"path": "/app/frontend/src/components/ui/alert.jsx", "content": "import * as React from \"react\"\nimport { cva } from \"class-variance-authority\"\n\nimport { cn } from \"../../lib/utils\"\n\nconst alertVariants = cva(\n  \"relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground\",\n  {\n    variants: {\n      variant: {\n        default: \"bg-background text-foreground\",\n        destructive:\n          \"border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive\",\n      },\n    },\n    defaultVariants: {\n      variant: \"default\",\n    },\n  }\n)\n\nconst Alert = React.forwardRef(({ className, variant, ...props }, ref) => (\n  <div\n    ref={ref}\n    role=\"alert\"\n    className={cn(alertVariants({ variant }), className)}\n    {...props}\n  />\n))\nAlert.displayName = \"Alert\"\n\nconst AlertTitle = React.forwardRef(({ className, ...props }, ref) => (\n  <h5\n    ref={ref}\n    className={cn(\"mb-1 font-medium leading-none tracking-tight\", className)}\n    {...props}\n  />\n))\nAlertTitle.displayName = \"AlertTitle\"\n\nconst AlertDescription = React.forwardRef(({ className, ...props }, ref) => (\n  <div\n    ref={ref}\n    className={cn(\"text-sm [&_p]:leading-relaxed\", className)}\n    {...props}\n  />\n))\nAlertDescription.displayName = \"AlertDescription\"\n\nexport { Alert, AlertTitle, AlertDescription }"}, {"path": "/app/frontend/src/lib/utils.js", "content": "import { clsx } from \"clsx\"\nimport { twMerge } from \"tailwind-merge\"\n\nexport function cn(...inputs) {\n  return twMerge(clsx(inputs))\n}"}]