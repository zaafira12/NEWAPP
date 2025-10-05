import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Wind, 
  Route,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bookmark,
  Share2,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';
import EnhancedLeafletMap from '../components/EnhancedLeafletMap';

const RoutePlannerPage = ({ userId }) => {
  const [source, setSource] = useState({ address: '', lat: null, lng: null });
  const [destination, setDestination] = useState({ address: '', lat: null, lng: null });
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPollution, setCurrentPollution] = useState(null);

  // Sample coordinates for demo (you can replace with geocoding API)
  const sampleLocations = {
    'New York, NY': { lat: 40.7128, lng: -74.0060 },
    'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
    'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
    'Houston, TX': { lat: 29.7604, lng: -95.3698 },
    'Phoenix, AZ': { lat: 33.4484, lng: -112.0740 },
    'Philadelphia, PA': { lat: 39.9526, lng: -75.1652 },
    'San Antonio, TX': { lat: 29.4241, lng: -98.4936 },
    'San Diego, CA': { lat: 32.7157, lng: -117.1611 },
    'Dallas, TX': { lat: 32.7767, lng: -96.7970 },
    'San Jose, CA': { lat: 37.3382, lng: -121.8863 }
  };

  const handleLocationSelect = (address, type) => {
    const coords = sampleLocations[address];
    if (coords) {
      if (type === 'source') {
        setSource({ address, ...coords });
      } else {
        setDestination({ address, ...coords });
      }
    }
  };

  const calculateRoutes = async () => {
    if (!source.lat || !destination.lat) {
      toast.error('Please select both source and destination locations');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/routes/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: source,
          destination: destination,
          preferences: {}
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate routes');
      }

      const data = await response.json();
      setRoutes(data.routes);
      
      if (data.routes.length > 0) {
        setSelectedRoute(data.routes[0]);
        toast.success(`Found ${data.routes.length} route options`);
      }
    } catch (error) {
      console.error('Error calculating routes:', error);
      toast.error('Failed to calculate routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveRoute = async (route) => {
    if (!userId) {
      toast.error('User ID not available');
      return;
    }

    try {
      const savedRoute = {
        user_id: userId,
        route_name: `${source.address} to ${destination.address}`,
        source: source,
        destination: destination,
        selected_route: route,
        alerts_enabled: true
      };

      const response = await fetch(`${API}/routes/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savedRoute),
      });

      if (!response.ok) {
        throw new Error('Failed to save route');
      }

      toast.success('Route saved successfully!');
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route. Please try again.');
    }
  };

  const fetchCurrentPollution = async (lat, lng) => {
    try {
      const response = await fetch(`${API}/pollution/current?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pollution data');
      }
      const data = await response.json();
      setCurrentPollution(data);
    } catch (error) {
      console.error('Error fetching pollution data:', error);
    }
  };

  useEffect(() => {
    if (source.lat && source.lng) {
      fetchCurrentPollution(source.lat, source.lng);
    }
  }, [source.lat, source.lng]);

  const getPollutionLevel = (score) => {
    if (score <= 30) return { level: 'Good', color: 'pollution-good', icon: CheckCircle };
    if (score <= 50) return { level: 'Moderate', color: 'pollution-moderate', icon: Info };
    if (score <= 70) return { level: 'Unhealthy for Sensitive Groups', color: 'pollution-unhealthy', icon: AlertTriangle };
    return { level: 'Unhealthy', color: 'pollution-very-unhealthy', icon: AlertTriangle };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-gray-600" data-testid="back-to-home-btn">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              
              <div className="flex items-center space-x-2">
                <Wind className="h-6 w-6 text-blue-600" />
                <span className="font-space-grotesk font-bold text-lg text-gray-900">
                  Route Planner
                </span>
              </div>
            </div>
            
            <Link to="/saved">
              <Button variant="outline" size="sm" data-testid="view-saved-routes-btn">
                <Bookmark className="w-4 h-4 mr-2" />
                Saved Routes
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Route Planning Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Location Input Card */}
            <Card className="shadow-lg border-0" data-testid="location-input-card">
              <CardHeader>
                <CardTitle className="flex items-center font-space-grotesk">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Plan Your Route
                </CardTitle>
                <CardDescription>
                  Select your starting point and destination for pollution-aware routing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source">From</Label>
                  <select
                    id="source"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={source.address}
                    onChange={(e) => handleLocationSelect(e.target.value, 'source')}
                    data-testid="source-select"
                  >
                    <option value="">Select starting location</option>
                    {Object.keys(sampleLocations).map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">To</Label>
                  <select
                    id="destination"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={destination.address}
                    onChange={(e) => handleLocationSelect(e.target.value, 'destination')}
                    data-testid="destination-select"
                  >
                    <option value="">Select destination</option>
                    {Object.keys(sampleLocations).map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={calculateRoutes} 
                  className="w-full btn-primary"
                  disabled={loading || !source.lat || !destination.lat}
                  data-testid="calculate-routes-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Calculate Routes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Current Air Quality Card */}
            {currentPollution && (
              <Card className="shadow-lg border-0" data-testid="air-quality-card">
                <CardHeader>
                  <CardTitle className="flex items-center font-space-grotesk">
                    <Wind className="w-5 h-5 mr-2 text-green-600" />
                    Current Air Quality
                  </CardTitle>
                  <CardDescription>
                    {source.address} - Real-time NASA TEMPO data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">AQI Score</span>
                      <Badge className={getPollutionLevel(currentPollution.aqi).color}>
                        {Math.round(currentPollution.aqi)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">NO₂:</span>
                        <span className="ml-1 font-medium">{currentPollution.no2} ppb</span>
                      </div>
                      <div>
                        <span className="text-gray-500">O₃:</span>
                        <span className="ml-1 font-medium">{currentPollution.o3} ppb</span>
                      </div>
                      <div>
                        <span className="text-gray-500">SO₂:</span>
                        <span className="ml-1 font-medium">{currentPollution.so2} ppb</span>
                      </div>
                      <div>
                        <span className="text-gray-500">CO₂:</span>
                        <span className="ml-1 font-medium">{currentPollution.co2} ppm</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Updated: {new Date(currentPollution.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Route Options */}
            {routes.length > 0 && (
              <Card className="shadow-lg border-0" data-testid="route-options-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between font-space-grotesk">
                    <div className="flex items-center">
                      <Route className="w-5 h-5 mr-2 text-purple-600" />
                      Route Options
                    </div>
                    <div className="text-sm text-gray-500">
                      {routes.length} routes found
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Routes sorted by air quality - cleanest first 🌿
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {routes.map((route, index) => {
                    const pollution = getPollutionLevel(route.pollution_score);
                    const IconComponent = pollution.icon;
                    
                    // Enhanced color coding based on pollution score
                    let routeColor, bgColor, borderColor, textColor, pollutionLabel, pollutionIcon;
                    
                    if (route.pollution_score <= 30) {
                      // LOW POLLUTION - GREEN
                      routeColor = '#10b981';
                      bgColor = 'bg-green-50';
                      borderColor = 'border-green-200';
                      textColor = 'text-green-800';
                      pollutionLabel = 'Low Pollution';
                      pollutionIcon = '🟢';
                    } else if (route.pollution_score <= 50) {
                      // MODERATE POLLUTION - YELLOW
                      routeColor = '#f59e0b';
                      bgColor = 'bg-yellow-50';
                      borderColor = 'border-yellow-200';
                      textColor = 'text-yellow-800';
                      pollutionLabel = 'Moderate Pollution';
                      pollutionIcon = '🟡';
                    } else {
                      // HIGH POLLUTION - RED
                      routeColor = '#ef4444';
                      bgColor = 'bg-red-50';
                      borderColor = 'border-red-200';
                      textColor = 'text-red-800';
                      pollutionLabel = 'High Pollution';
                      pollutionIcon = '🔴';
                    }
                    
                    return (
                      <div
                        key={route.id}
                        className={`relative cursor-pointer transition-all duration-300 rounded-xl p-4 border-2 ${
                          selectedRoute?.id === route.id 
                            ? `${bgColor} ${borderColor} shadow-lg transform scale-[1.02]` 
                            : `bg-white border-gray-200 hover:shadow-md hover:${bgColor} hover:${borderColor}`
                        }`}
                        onClick={() => setSelectedRoute(route)}
                        data-testid={`route-option-${index}`}
                      >
                        {/* Pollution Level Banner */}
                        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl`} style={{ backgroundColor: routeColor }}></div>
                        
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Route Header with Color Coding */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-bold text-lg text-gray-900">{route.route_name}</h4>
                                <div className="flex items-center space-x-1">
                                  <span className="text-lg">{pollutionIcon}</span>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${bgColor} ${textColor}`}>
                                    {pollutionLabel}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Pollution Score Badge */}
                              <div 
                                className="px-3 py-1 rounded-full text-white font-bold text-sm shadow-sm"
                                style={{ backgroundColor: routeColor }}
                              >
                                {Math.round(route.pollution_score)}
                              </div>
                            </div>
                            
                            {/* Route Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="font-semibold">{route.distance_km} km</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4 text-purple-500" />
                                <span className="font-semibold">{Math.round(route.duration_minutes / 60)}h {route.duration_minutes % 60}m</span>
                              </div>
                            </div>

                            {/* Air Quality Breakdown */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <Wind className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-semibold text-gray-700">Air Quality Along Route</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="font-medium text-gray-600">NO₂</div>
                                  <div className={`font-bold ${textColor}`}>{route.pollutant_levels?.no2}</div>
                                  <div className="text-gray-500">ppb</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-gray-600">O₃</div>
                                  <div className={`font-bold ${textColor}`}>{route.pollutant_levels?.o3}</div>
                                  <div className="text-gray-500">ppb</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-gray-600">SO₂</div>
                                  <div className={`font-bold ${textColor}`}>{route.pollutant_levels?.so2}</div>
                                  <div className="text-gray-500">ppb</div>
                                </div>
                              </div>
                            </div>

                            {/* Intermediate Cities Route */}
                            {route.waypoint_details && route.waypoint_details.filter(w => w.type === 'intermediate').length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Route className="w-4 h-4 text-indigo-500" />
                                  <span className="text-sm font-semibold text-gray-700">Route Path</span>
                                </div>
                                <div className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border">
                                  {source.address.split(',')[0]} → {
                                    route.waypoint_details
                                      .filter(w => w.type === 'intermediate')
                                      .map(w => w.name.split(',')[0])
                                      .join(' → ')
                                  } → {destination.address.split(',')[0]}
                                </div>
                              </div>
                            )}

                            {/* Health Recommendations */}
                            {route.recommendations && route.recommendations.length > 0 && (
                              <div className="bg-white rounded-lg border p-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <AlertTriangle className={`w-4 h-4 ${route.pollution_score > 50 ? 'text-red-500' : 'text-green-500'}`} />
                                  <span className="text-sm font-semibold text-gray-700">Health Recommendations</span>
                                </div>
                                <ul className="space-y-1">
                                  {route.recommendations.slice(0, 2).map((rec, i) => (
                                    <li key={i} className="flex items-start space-x-2 text-xs text-gray-600">
                                      <span className="text-gray-400 mt-1">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                  {route.recommendations.length > 2 && (
                                    <li className="text-xs text-gray-500 italic">
                                      +{route.recommendations.length - 2} more recommendations
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="ml-4 flex flex-col space-y-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`hover:${bgColor} hover:${borderColor} hover:${textColor}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRoute(route);
                              }}
                              data-testid={`save-route-btn-${index}`}
                            >
                              <Bookmark className="w-4 h-4" />
                            </Button>
                            
                            {selectedRoute?.id === route.id && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Map */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 h-full" data-testid="map-card">
              <CardHeader>
                <CardTitle className="flex items-center font-space-grotesk">
                  <MapPin className="w-5 h-5 mr-2 text-red-600" />
                  Route Visualization
                </CardTitle>
                {selectedRoute && (
                  <CardDescription>
                    Showing: {selectedRoute.route_name} - Pollution Score: {selectedRoute.pollution_score}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="map-container h-96 lg:h-[600px]">
                  <EnhancedLeafletMap
                    source={source}
                    destination={destination}
                    selectedRoute={selectedRoute}
                    routes={routes}
                    showHeatmap={true}
                    enablePinDrop={true}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Route Details Section */}
        {selectedRoute && (
          <div className="mt-8">
            <Card className="shadow-lg border-0" data-testid="route-details-card">
              <CardHeader>
                <CardTitle className="font-space-grotesk">Route Details: {selectedRoute.route_name}</CardTitle>
                <CardDescription>
                  Comprehensive analysis and health recommendations for your selected route
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Pollutant Levels */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Wind className="w-4 h-4 mr-2 text-blue-600" />
                      Average Pollutant Levels
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(selectedRoute.pollutant_levels).map(([pollutant, level]) => (
                        <div key={pollutant} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 uppercase">
                            {pollutant}
                          </span>
                          <Badge variant="secondary" className="text-sm">
                            {level} {pollutant === 'co2' ? 'ppm' : 'ppb'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Health Recommendations */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                      Health Recommendations
                    </h4>
                    <div className="space-y-2">
                      {selectedRoute.recommendations.map((recommendation, index) => (
                        <Alert key={index} className="py-2">
                          <AlertDescription className="text-sm">
                            {recommendation}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutePlannerPage;