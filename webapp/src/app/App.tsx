import React, { useState, useEffect } from 'react';
import { StatsPage, AdminLoginPage, AdminResultsPage } from '@/pages';
import { Button } from '@/shared/ui';
import { adminAuthApi } from '@/features/admin-auth';
import './styles/App.css';

type View = 'stats' | 'admin-login' | 'admin-results';

const App: React.FC = () => {
  console.log('[APP] Component mounting...');

  const [currentView, setCurrentView] = useState<View>('stats');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[APP] useEffect running...');
    try {
      const token = adminAuthApi.getToken();
      console.log('[APP] Admin token exists:', !!token);
      if (token) {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('[APP] Error checking auth:', err);
      setError('Auth check failed');
    } finally {
      setChecking(false);
    }
  }, []);

  const handleLogin = () => {
    console.log('[APP] Login successful');
    setIsAdmin(true);
    setCurrentView('admin-results');
  };

  const handleLogout = () => {
    console.log('[APP] Logging out');
    adminAuthApi.logout();
    setIsAdmin(false);
    setCurrentView('stats');
  };

  const navigateToAdmin = () => {
    console.log('[APP] Navigating to admin');
    if (isAdmin) {
      setCurrentView('admin-results');
    } else {
      setCurrentView('admin-login');
    }
  };

  const navigateToStats = () => {
    console.log('[APP] Navigating to stats');
    setCurrentView('stats');
  };

  console.log('[APP] Render - checking:', checking, 'error:', error, 'view:', currentView);

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error">Ошибка: {error}</div>
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

export default App;
