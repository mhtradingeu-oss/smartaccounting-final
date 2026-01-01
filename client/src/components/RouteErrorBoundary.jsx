import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageErrorState } from './ui/PageStates';
import { reportClientError } from '../lib/telemetryClient';

const appVersion = import.meta.env.VITE_APP_VERSION || 'unknown';

class RouteErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('RouteErrorBoundary caught an error:', error, errorInfo);
    }
    if (import.meta.env.VITE_TELEMETRY_ENABLED === 'true') {
      try {
        const route = window.location.pathname;
        const version = appVersion;
        const requestId = window.__LAST_REQUEST_ID__ || null;
        reportClientError({
          route,
          version,
          requestId,
          errorType: 'RouteErrorBoundary',
        });
      } catch (e) {
        void e;
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
          <PageErrorState onRetry={this.handleRetry} />
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();

  return (
    <RouteErrorBoundaryInner key={location.key || location.pathname}>
      {children}
    </RouteErrorBoundaryInner>
  );
}
