import React, { useState, useEffect } from 'react';
import { QueryProvider } from './providers';
import { StatsPage, AdminLoginPage, AdminResultsPage } from '@/pages';
import { Button } from '@/shared/ui';
import { adminApi } from '@/entities/admin';
import './styles/App.css';

console.log('[APP] Module loaded');

type View = 'stats' | 'admin-login' | 'admin-results';

const AppContent: React.FC = () => {
  console.log('[APP CONTENT] Rendering...');
  
  const [currentView, setCurrentView] = useState<View>('stats');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    console.log('[APP CONTENT] Checking auth...');
    try {
      const token = adminApi.getToken();
      console.log('[APP CONTENT] Token exists:', !!token);
      if (token) {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('[APP CONTENT] Error checking auth:', err);
    } finally {
      setChecking(false);
    }
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
    console.log('[APP CONTENT] Showing loading state');
    return (
      <div className="loading-screen">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  console.log('[APP CONTENT] Rendering view:', currentView);

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

  console.error('[APP CONTENT] Unknown view:', currentView);
  return <div>Unknown view</div>;
};

const App: React.FC = () => {
  console.log('[APP] Rendering with QueryProvider...');
  
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
};

export default App;
