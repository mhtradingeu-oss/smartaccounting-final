import { API_BASE_URL } from '../services/api';

const LOG_ENDPOINT = `${API_BASE_URL}/logs`;

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
  }

  log(level, message, meta = {}) {
    if (this.isDevelopment) {
      console[level](message, meta);
    }

    if (this.isProduction && ['error', 'warn'].includes(level)) {
      this.sendToBackend(level, message, meta);
    }
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      this.log('debug', message, meta);
    }
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  async sendToBackend(level, message, meta) {
    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage?.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      await fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          level,
          message,
          meta,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      if (this.isDevelopment) {
        console.error('Failed to send log to backend', error);
      }
    }
  }
}

export const logger = new Logger();
