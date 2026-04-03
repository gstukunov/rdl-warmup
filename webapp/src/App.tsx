import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { GameResultsPage } from './pages/GameResultsPage';
import { adminApi } from './api/admin';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = adminApi.getToken();
    setIsAuthenticated(!!token);
    setChecking(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    adminApi.clearToken();
    setIsAuthenticated(false);
  };

  if (checking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <GameResultsPage onLogout={handleLogout} />;
};

export default App;
