

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
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
