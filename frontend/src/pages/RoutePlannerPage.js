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
import SimpleLeafletMap from '../components/SimpleLeafletMap';

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
                  <CardTitle className="flex items-center font-space-grotesk">
                    <Route className="w-5 h-5 mr-2 text-purple-600" />
                    Route Options
                  </CardTitle>
                  <CardDescription>
                    Choose the best route based on air quality and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {routes.map((route, index) => {
                    const pollution = getPollutionLevel(route.pollution_score);
                    const IconComponent = pollution.icon;
                    
                    return (
                      <div
                        key={route.id}
                        className={`route-card cursor-pointer transition-all duration-200 ${
                          selectedRoute?.id === route.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedRoute(route)}
                        data-testid={`route-option-${index}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-2">{route.route_name}</h4>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {route.distance_km} km
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {route.duration_minutes} min
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 mb-2">
                              <IconComponent className="w-4 h-4" />
                              <Badge className={`pollution-indicator ${pollution.color}`}>
                                {pollution.level} (Score: {route.pollution_score})
                              </Badge>
                            </div>

                            {route.recommendations.length > 0 && (
                              <div className="text-xs text-gray-500">
                                <div className="font-medium mb-1">Recommendations:</div>
                                <ul className="space-y-1">
                                  {route.recommendations.slice(0, 2).map((rec, i) => (
                                    <li key={i} className="flex items-start">
                                      <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <div className="ml-4 flex flex-col space-y-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveRoute(route);
                              }}
                              data-testid={`save-route-btn-${index}`}
                            >
                              <Bookmark className="w-3 h-3" />
                            </Button>
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
                  <LeafletMap
                    source={source}
                    destination={destination}
                    selectedRoute={selectedRoute}
                    routes={routes}
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