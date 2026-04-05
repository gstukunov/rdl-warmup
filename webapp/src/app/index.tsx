import React, { useEffect, Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Debug logging
console.log('[MAIN] Starting webapp...');
(window as any).__APP_LOADED__ = true;

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ERROR BOUNDARY]', error, errorInfo);
    
    // Show error on screen
    const errorDiv = document.getElementById('error-display');
    if (errorDiv) {
      errorDiv.textContent = 'React Error:\n' + error.message + '\n\n' + (error.stack || '');
      errorDiv.classList.add('visible');
    }
    
    // Hide loader
    const loader = document.getElementById('initial-loading');
    if (loader) {
      loader.classList.add('hidden');
    }
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 20, color: 'red' }}>Something went wrong. Check console.</div>;
    }
    return this.props.children;
  }
}

// Function to hide loading screen
const hideLoadingScreen = () => {
  const loader = document.getElementById('initial-loading');
  if (loader) {
    loader.classList.add('hidden');
    console.log('[MAIN] Loading screen hidden');
  }
};

// App wrapper that hides loading screen after mount
const AppWithLoadingScreen: React.FC = () => {
  useEffect(() => {
    console.log('[APP] Mounted, hiding loading screen...');
    const timer = setTimeout(hideLoadingScreen, 100);
    return () => clearTimeout(timer);
  }, []);

  return <App />;
};

// Mount the app
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[MAIN] Root element not found!');
  const errorDiv = document.getElementById('error-display');
  if (errorDiv) {
    errorDiv.textContent = 'Root element not found';
    errorDiv.classList.add('visible');
  }
} else {
  try {
    console.log('[MAIN] Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    
    console.log('[MAIN] Rendering app...');
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppWithLoadingScreen />
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('[MAIN] Render called successfully');
  } catch (error) {
    console.error('[MAIN] Failed to render app:', error);
    const errorDiv = document.getElementById('error-display');
    if (errorDiv) {
      errorDiv.textContent = `Failed to render: ${error}`;
      errorDiv.classList.add('visible');
    }
  }
}
