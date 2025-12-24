'use strict';

const Sentry = require('@sentry/node');

let initialized = false;

function init() {
  if (initialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const environment = process.env.SENTRY_ENV || process.env.NODE_ENV || 'development';
  const parsedSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);
  const tracesSampleRate = Number.isFinite(parsedSampleRate) ? parsedSampleRate : undefined;

  const config = {
    dsn,
    environment,
    maxBreadcrumbs: 50,
  };

  if (tracesSampleRate !== undefined && tracesSampleRate >= 0 && tracesSampleRate <= 1) {
    config.tracesSampleRate = tracesSampleRate;
  }

  Sentry.init(config);
  initialized = true;
}

function captureException(error, context = {}) {
  if (!initialized) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context.requestId) {
      scope.setTag('requestId', context.requestId);
    }

    if (context.companyId) {
      scope.setTag('companyId', context.companyId);
    }

    if (context.route) {
      scope.setTag('route', context.route);
    }

    if (context.method) {
      scope.setTag('method', context.method);
    }

    if (context.userId) {
      scope.setUser({
        id: String(context.userId),
        companyId: context.companyId,
      });
    }

    if (context.statusCode) {
      scope.setExtra('statusCode', context.statusCode);
    }

    if (context.durationMs !== undefined) {
      scope.setExtra('durationMs', context.durationMs);
    }

    if (context.path) {
      scope.setExtra('path', context.path);
    }

    Sentry.captureException(error);
  });
}

module.exports = {
  init,
  captureException,
};
