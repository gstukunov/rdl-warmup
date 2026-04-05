import React, { useState, useEffect } from 'react';
import { QueryProvider } from './providers';
import { StatsPage, AdminLoginPage, AdminResultsPage } from '@/pages';
import { Button } from '@/shared/ui';
import { adminApi } from '@/entities/admin';
import './styles/App.css';

type View = 'stats' | 'admin-login' | 'admin-results';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('stats');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if admin token exists
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

  if (currentView === 'stats') {
    return (
      <div className="app-container">
        <div className="admin-nav">
          <Button onClick={navigateToAdmin} variant="secondary" size="sm">
            {isAdmin ? 'Панель админа' : 'Вход для админа'}
          </Button>
        </div>
        <StatsPage />
      </div>
    );
  }

  if (currentView === 'admin-login') {
    return (
      <div className="app-container">
        <div className="admin-nav">
          <Button onClick={navigateToStats} variant="secondary" size="sm">
            ← К статистике
          </Button>
        </div>
        <AdminLoginPage onLogin={handleLogin} />
      </div>
    );
  }

  if (currentView === 'admin-results') {
    return <AdminResultsPage onLogout={handleLogout} />;
  }

  return null;
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
};

export default App;
