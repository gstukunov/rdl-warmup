import React, { useState, useEffect } from 'react';
import { StatsPage } from './pages/StatsPage';
import { LoginPage } from './pages/LoginPage';
import { GameResultsPage } from './pages/GameResultsPage';
import { adminApi } from './api/admin';
import { Button } from './components/Button';
import './App.css';

type View = 'stats' | 'admin-login' | 'admin-results';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('stats');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated as admin
    const token = adminApi.getToken();
    if (token) {
      setIsAdmin(true);
    }
    setChecking(false);
  }, []);

  const handleLogin = () => {
    setIsAdmin(true);
    setCurrentView('admin-results');
  };

  const handleLogout = () => {
    adminApi.clearToken();
    setIsAdmin(false);
    setCurrentView('stats');
  };

  const navigateToAdmin = () => {
    if (isAdmin) {
      setCurrentView('admin-results');
    } else {
      setCurrentView('admin-login');
    }
  };

  const navigateToStats = () => {
    setCurrentView('stats');
  };

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  // Show stats page (public)
  if (currentView === 'stats') {
    return (
      <div>
        <div className="admin-nav">
          <Button onClick={navigateToAdmin} variant="secondary" size="sm">
            {isAdmin ? 'Панель админа' : 'Вход для админа'}
          </Button>
        </div>
        <StatsPage />
      </div>
    );
  }

  // Show admin login
  if (currentView === 'admin-login') {
    return (
      <div>
        <div className="admin-nav">
          <Button onClick={navigateToStats} variant="secondary" size="sm">
            ← К статистике
          </Button>
        </div>
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  // Show admin results page
  if (currentView === 'admin-results') {
    return <GameResultsPage onLogout={handleLogout} />;
  }

  return null;
};

export default App;
