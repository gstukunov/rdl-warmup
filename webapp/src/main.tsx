import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Debug logging
console.log('[MAIN] Starting webapp...');
console.log('[MAIN] Root element:', document.getElementById('root'));

// Add global error handler
window.onerror = function(msg, url, line, col, error) {
  console.error('[GLOBAL ERROR]', msg, 'at', url, line, col, error);
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('[UNHANDLED REJECTION]', event.reason);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[MAIN] Root element not found!');
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('[MAIN] App rendered successfully');
  } catch (error) {
    console.error('[MAIN] Failed to render app:', error);
    rootElement.innerHTML = '<div style="padding: 20px; color: red;">Error loading app. Check console.</div>';
  }
}
