// Enhanced WebSocket protocol detection for Replit environment
if (typeof window !== 'undefined' && window.location) {
  // Force WSS for HTTPS pages or Replit environment
  if (window.location.protocol === 'https:' || window.location.hostname.includes('replit.dev')) {
    window.__vite_ws_protocol__ = 'wss:';
    window.__vite_ws_host__ = window.location.hostname;
    window.__vite_ws_port__ = 3000;
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './i18n';
import ErrorBoundary from './components/ErrorBoundary';


import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { CompanyProvider } from './context/CompanyContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
          <RoleProvider>
            <App />
          </RoleProvider>
        </CompanyProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);