import React from 'react';
import ErrorState from './ErrorState';
import { reportClientError } from '../lib/telemetryClient';

const appVersion = import.meta.env.VITE_APP_VERSION || 'unknown';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('AppErrorBoundary caught an error:', error, errorInfo);
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
          errorType: 'AppErrorBoundary',
        });
      } catch (reportError) {
        void reportError;
      }
    }
  }

  componentDidUpdate(prevProps) {
    const { location } = this.props;
    const prevLocation = prevProps.location;

    if (!prevLocation || !location || !this.state.hasError) {
      return;
    }

    const locationChanged =
      location.key !== prevLocation.key ||
      location.pathname !== prevLocation.pathname ||
      location.search !== prevLocation.search;

    if (locationChanged) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    window.location.reload();
  };

  handleLogout = async () => {
    try {
      if (typeof this.props.logout === 'function') {
        await this.props.logout();
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Logout failed from AppErrorBoundary:', err);
      }
    } finally {
      window.location.reload();
    }
  };

  render() {
    const { hasError } = this.state;
    const { t, children } = this.props;

    if (!hasError) {
      return children;
    }

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl p-6 space-y-6 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              {t('states.error.title')}
            </p>
          </div>
          <div>
            <ErrorState onRetry={this.handleRetry} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('states.error.help')}</p>
          <div className="flex flex-col gap-3 items-center">
            <button
              type="button"
              onClick={this.handleLogout}
              className="w-full max-w-[220px] px-4 py-2 rounded-md border border-transparent bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
            >
              {t('auth.logout')}
            </button>
          </div>
          {import.meta.env.DEV && this.state.error?.stack && (
            <details className="text-xs text-left text-gray-500 dark:text-gray-400">
              <summary className="cursor-pointer">Error stack</summary>
              <pre className="mt-2 whitespace-pre-wrap text-[11px]">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
