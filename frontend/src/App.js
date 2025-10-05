import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import RoutePlannerPage from './pages/RoutePlannerPage';
import SavedRoutesPage from './pages/SavedRoutesPage';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [userId] = useState(() => {
    // Generate a simple user ID for demo purposes
    const stored = localStorage.getItem('clean-air-user-id');
    if (stored) return stored;
    
    const newId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('clean-air-user-id', newId);
    return newId;
  });

  // Health check on app load
  useEffect(() => {
    const healthCheck = async () => {
      try {
        const response = await fetch(`${API}/health`);
        const data = await response.json();
        console.log('API Health:', data);
      } catch (error) {
        console.error('API Health Check Failed:', error);
      }
    };
    
    healthCheck();
  }, []);

  return (
    <div className="App min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/planner" element={<RoutePlannerPage userId={userId} />} />
          <Route path="/saved" element={<SavedRoutesPage userId={userId} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;