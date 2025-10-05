import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Wind, 
  Route, 
  Shield, 
  Satellite, 
  MapPin, 
  TrendingUp,
  AlertTriangle,
  Bookmark,
  Navigation
} from 'lucide-react';
import { API } from '../App';

const HomePage = () => {
  const [healthStatus, setHealthStatus] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API}/health`);
        const data = await response.json();
        setHealthStatus(data);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    checkHealth();
  }, []);

  const features = [
    {
      icon: <Satellite className="h-8 w-8 text-blue-600" />,
      title: "NASA TEMPO Integration",
      description: "Real-time air quality data from NASA's advanced satellite monitoring system",
      badge: "Real-time"
    },
    {
      icon: <Route className="h-8 w-8 text-green-600" />,
      title: "Smart Route Planning", 
      description: "Multiple route options with pollution scoring and health recommendations",
      badge: "AI-Powered"
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-600" />,
      title: "Health Protection",
      description: "Personalized safety recommendations based on air quality conditions",
      badge: "Health First"
    },
    {
      icon: <AlertTriangle className="h-8 w-8 text-orange-600" />,
      title: "Pollution Alerts",
      description: "Real-time notifications about air quality changes on your saved routes",
      badge: "Alerts"
    }
  ];

  const pollutants = [
    { name: "NO₂", description: "Nitrogen Dioxide", color: "bg-red-500", impact: "Respiratory irritation" },
    { name: "O₃", description: "Ground-level Ozone", color: "bg-orange-500", impact: "Breathing difficulty" },
    { name: "SO₂", description: "Sulfur Dioxide", color: "bg-yellow-500", impact: "Throat irritation" },
    { name: "CO₂", description: "Carbon Dioxide", color: "bg-blue-500", impact: "Climate impact" },
    { name: "CH₄", description: "Methane", color: "bg-purple-500", impact: "Greenhouse gas" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Wind className="h-8 w-8 text-blue-600" />
              <span className="font-space-grotesk font-bold text-xl text-gray-900">
                Clean Air Routes
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className="nav-link active" data-testid="home-nav-link">
                Home
              </Link>
              <Link to="/planner" className="nav-link" data-testid="planner-nav-link">
                Route Planner
              </Link>
              <Link to="/saved" className="nav-link" data-testid="saved-routes-nav-link">
                Saved Routes
              </Link>
            </div>

            <Link to="/planner">
              <Button className="btn-primary" data-testid="get-started-btn">
                <MapPin className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-emerald-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Badge className="bg-blue-100 text-blue-800 px-4 py-2 text-sm font-medium">
                <Satellite className="w-4 h-4 mr-2" />
                Powered by NASA TEMPO
              </Badge>
            </div>
            
            <h1 className="font-space-grotesk text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Navigate Through
              <span className="block gradient-text">Cleaner Air</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Plan your journeys with real-time air quality data from NASA satellites. 
              Choose routes that protect your health and minimize pollution exposure.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/planner">
                <Button size="lg" className="btn-primary text-lg px-8 py-4" data-testid="start-planning-btn">
                  <Navigation className="w-5 h-5 mr-2" />
                  Start Planning Routes
                </Button>
              </Link>
              
              <Button variant="outline" size="lg" className="btn-secondary text-lg px-8 py-4" data-testid="learn-more-btn">
                <TrendingUp className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>

            {/* Health Status Indicator */}
            {healthStatus && (
              <div className="mt-8 inline-flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>API Status: Online</span>
                <span className="text-gray-400">•</span>
                <span>Last updated: {new Date(healthStatus.timestamp).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-space-grotesk text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Advanced Air Quality Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Combining NASA satellite technology with intelligent route planning for healthier travel decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="interactive-card border-0 shadow-lg hover:shadow-xl" data-testid={`feature-card-${index}`}>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <div className="flex justify-center mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="font-space-grotesk text-xl">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pollutants Monitoring Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-space-grotesk text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Pollution Monitoring
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Track multiple harmful pollutants in real-time to make informed travel decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pollutants.map((pollutant, index) => (
              <Card key={index} className="glass-card hover:shadow-lg transition-all duration-300" data-testid={`pollutant-card-${index}`}>
                <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                  <div className={`w-4 h-4 rounded-full ${pollutant.color} mr-3`}></div>
                  <div>
                    <CardTitle className="text-lg font-space-grotesk">{pollutant.name}</CardTitle>
                    <CardDescription className="text-sm">{pollutant.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Health Impact:</span> {pollutant.impact}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-space-grotesk text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Breathe Easier?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Start planning your routes with real-time air quality data. 
              Protect your health while traveling smarter.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/planner">
                <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-50 text-lg px-8 py-4" data-testid="start-now-btn">
                  <MapPin className="w-5 h-5 mr-2" />
                  Start Planning Now
                </Button>
              </Link>
              
              <Link to="/saved">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-4" data-testid="view-saved-btn">
                  <Bookmark className="w-5 h-5 mr-2" />
                  View Saved Routes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Wind className="h-6 w-6 text-blue-400" />
              <span className="font-space-grotesk font-bold text-lg">Clean Air Routes</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>Powered by NASA TEMPO Satellite Data</span>
              <span>•</span>
              <span>Built for Health & Environment</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;