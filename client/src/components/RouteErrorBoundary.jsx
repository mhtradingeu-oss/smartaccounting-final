import React from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundaryFallback from './ui/ErrorBoundaryFallback';
import { reportClientError } from '../lib/telemetryClient';
import { useTranslation } from 'react-i18next';

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
      return <ErrorBoundaryFallback title={this.props.title} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <RouteErrorBoundaryInner
      key={location.key || location.pathname}
      title={t('states.error.title')}
    >
      {children}
    </RouteErrorBoundaryInner>
  );
}
