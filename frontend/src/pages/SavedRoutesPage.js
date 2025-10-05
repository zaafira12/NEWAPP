import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  ArrowLeft, 
  Wind, 
  Route,
  MapPin,
  Clock,
  Trash2,
  Bell,
  BellOff,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Bookmark
} from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const SavedRoutesPage = ({ userId }) => {
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedRoutes = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API}/routes/saved/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch saved routes');
      }
      const data = await response.json();
      setSavedRoutes(data);
    } catch (error) {
      console.error('Error fetching saved routes:', error);
      toast.error('Failed to load saved routes');
    }
  };

  const fetchAlerts = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API}/alerts/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Don't show error toast for alerts as it's not critical
    }
  };

  const deleteRoute = async (routeId) => {
    try {
      const response = await fetch(`${API}/routes/saved/${routeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete route');
      }
      
      setSavedRoutes(routes => routes.filter(route => route.id !== routeId));
      toast.success('Route deleted successfully');
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchSavedRoutes(), fetchAlerts()]);
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSavedRoutes(), fetchAlerts()]);
      setLoading(false);
    };
    
    loadData();
  }, [userId]);

  const getPollutionLevel = (score) => {
    if (score <= 30) return { level: 'Good', color: 'pollution-good', icon: CheckCircle };
    if (score <= 50) return { level: 'Moderate', color: 'pollution-moderate', icon: Info };
    if (score <= 70) return { level: 'Unhealthy for Sensitive Groups', color: 'pollution-unhealthy', icon: AlertTriangle };
    return { level: 'Unhealthy', color: 'pollution-very-unhealthy', icon: AlertTriangle };
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'extreme': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your saved routes...</p>
        </div>
      </div>
    );
  }

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
                <Bookmark className="h-6 w-6 text-blue-600" />
                <span className="font-space-grotesk font-bold text-lg text-gray-900">
                  Saved Routes
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
                data-testid="refresh-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Link to="/planner">
                <Button size="sm" className="btn-primary" data-testid="plan-new-route-btn">
                  <Route className="w-4 h-4 mr-2" />
                  Plan New Route
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-space-grotesk text-3xl font-bold text-gray-900 mb-2">
            Your Saved Routes
          </h1>
          <p className="text-gray-600">
            Manage your bookmarked routes and view pollution alerts for better travel planning.
          </p>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <Card className="shadow-lg border-0" data-testid="alerts-card">
              <CardHeader>
                <CardTitle className="flex items-center font-space-grotesk text-orange-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Pollution Alerts
                </CardTitle>
                <CardDescription>
                  Current air quality warnings for your saved routes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <Alert key={alert.id} className={`border-l-4 ${
                      alert.severity === 'high' || alert.severity === 'extreme' 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-orange-400 bg-orange-50'
                    }`} data-testid={`alert-${index}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <AlertDescription className="font-medium text-gray-900">
                            {alert.message}
                          </AlertDescription>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getAlertSeverityColor(alert.severity)}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </Badge>
                      </div>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Saved Routes */}
        {savedRoutes.length === 0 ? (
          <div className="text-center py-12">
            <Card className="shadow-lg border-0 max-w-md mx-auto" data-testid="no-routes-card">
              <CardContent className="pt-8">
                <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-space-grotesk text-xl font-semibold text-gray-900 mb-2">
                  No Saved Routes Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start planning routes and save your favorites to access them quickly later.
                </p>
                <Link to="/planner">
                  <Button className="btn-primary" data-testid="plan-first-route-btn">
                    <Route className="w-4 h-4 mr-2" />
                    Plan Your First Route
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedRoutes.map((savedRoute, index) => {
              const route = savedRoute.selected_route;
              const pollution = getPollutionLevel(route.pollution_score);
              const IconComponent = pollution.icon;

              return (
                <Card key={savedRoute.id} className="shadow-lg border-0 interactive-card" data-testid={`saved-route-card-${index}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="font-space-grotesk text-lg mb-1">
                          {savedRoute.route_name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Saved on {new Date(savedRoute.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      
                      <div className="flex items-center space-x-1 ml-2">
                        {savedRoute.alerts_enabled ? (
                          <Bell className="w-4 h-4 text-green-600" title="Alerts enabled" />
                        ) : (
                          <BellOff className="w-4 h-4 text-gray-400" title="Alerts disabled" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Route Summary */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Distance:</span>
                        <span className="font-medium">{route.distance_km} km</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{route.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Route Type:</span>
                        <span className="font-medium">{route.route_name}</span>
                      </div>
                    </div>

                    {/* Pollution Level */}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Air Quality:</span>
                        <div className="flex items-center space-x-2">
                          <IconComponent className="w-4 h-4" />
                          <Badge className={`pollution-indicator ${pollution.color}`}>
                            {pollution.level}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Pollution Score: {route.pollution_score}/100
                      </div>
                    </div>

                    {/* Top Recommendations */}
                    {route.recommendations.length > 0 && (
                      <div className="border-t pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Recommendations:</h4>
                        <div className="space-y-1">
                          {route.recommendations.slice(0, 2).map((rec, i) => (
                            <div key={i} className="flex items-start text-xs text-gray-600">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="border-t pt-3 flex justify-between items-center">
                      <Link to="/planner" state={{ 
                        source: savedRoute.source, 
                        destination: savedRoute.destination 
                      }}>
                        <Button size="sm" variant="outline" data-testid={`replan-route-btn-${index}`}>
                          <Route className="w-3 h-3 mr-1" />
                          Re-plan
                        </Button>
                      </Link>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteRoute(savedRoute.id)}
                        data-testid={`delete-route-btn-${index}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Statistics Card */}
        {savedRoutes.length > 0 && (
          <div className="mt-8">
            <Card className="shadow-lg border-0" data-testid="statistics-card">
              <CardHeader>
                <CardTitle className="flex items-center font-space-grotesk">
                  <Wind className="w-5 h-5 mr-2 text-blue-600" />
                  Your Route Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {savedRoutes.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Saved Routes</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {savedRoutes.filter(r => r.selected_route.pollution_score <= 30).length}
                    </div>
                    <div className="text-sm text-gray-600">Clean Air Routes</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {alerts.length}
                    </div>
                    <div className="text-sm text-gray-600">Active Alerts</div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {savedRoutes.filter(r => r.alerts_enabled).length}
                    </div>
                    <div className="text-sm text-gray-600">Alert-Enabled Routes</div>
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

export default SavedRoutesPage;