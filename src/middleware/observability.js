'use strict';

const promClient = require('prom-client');
const logger = require('../lib/logger');
const { updateRequestContext } = require('../lib/logger/context');

const METRICS_ENABLED = process.env.METRICS_ENABLED === 'true';
const METRICS_BASIC_AUTH_USER = process.env.METRICS_BASIC_AUTH_USER;
const METRICS_BASIC_AUTH_PASS = process.env.METRICS_BASIC_AUTH_PASS;
const LOG_SLOW_REQUEST_MS = Number(process.env.LOG_SLOW_REQUEST_MS || 1000);

const metricsRegistry = new promClient.Registry();
let httpRequestDurationHistogram = null;
let httpRequestCounter = null;

if (METRICS_ENABLED) {
  metricsRegistry.setDefaultLabels({ service: 'smartaccounting' });
  promClient.collectDefaultMetrics({
    register: metricsRegistry,
    timeout: 10000,
  });

  httpRequestDurationHistogram = new promClient.Histogram({
    name: 'smartaccounting_http_response_duration_seconds',
    help: 'Duration of HTTP responses in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.02, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [metricsRegistry],
  });

  httpRequestCounter = new promClient.Counter({
    name: 'smartaccounting_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [metricsRegistry],
  });
}

const resolveRouteLabel = (req) => {
  if (req.route && req.route.path) {
    const normalizedBase = req.baseUrl?.endsWith('/') ? req.baseUrl.slice(0, -1) : req.baseUrl || '';
    const normalizedPath = req.route.path.startsWith('/') ? req.route.path : `/${req.route.path}`;
    return `${normalizedBase}${normalizedPath}`.replace(/\/+/g, '/');
  }

  if (req.originalUrl) {
    return req.originalUrl.split('?')[0];
  }

  return 'unknown';
};

const recordMetrics = (labels, durationSeconds) => {
  if (!METRICS_ENABLED) {
    return;
  }
  const { method, route, status } = labels;
  httpRequestCounter?.labels(method, route, status).inc();
  httpRequestDurationHistogram?.labels(method, route, status).observe(durationSeconds);
};

const logRequest = (req, res, routeLabel, durationMs) => {
  const statusCode = res.statusCode || 0;
  const logPayload = {
    requestId: req.requestId,
    userId: req.userId || req.user?.id || null,
    companyId: req.companyId || req.user?.companyId || null,
    method: req.method,
    path: req.originalUrl,
    route: routeLabel,
    statusCode,
    durationMs,
    ip: req.ip,
    userAgent: req.get('User-Agent') || '',
  };

  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger[level]('HTTP request', logPayload);
  if (durationMs > LOG_SLOW_REQUEST_MS) {
    logger.warn('Slow request detected', logPayload);
  }
};

const requestObservabilityMiddleware = (req, res, next) => {
  const startTime = process.hrtime();
  let recorded = false;

  const record = () => {
    if (recorded) {
      return;
    }
    recorded = true;

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const durationMs = Number((seconds * 1000 + nanoseconds / 1e6).toFixed(2));
    const durationSeconds = seconds + nanoseconds / 1e9;
    const statusCode = res.statusCode || 0;
    const routeLabel = resolveRouteLabel(req);

    updateRequestContext({
      statusCode,
      durationMs,
      route: routeLabel,
    });

    recordMetrics(
      {
        method: req.method,
        route: routeLabel,
        status: `${statusCode}`,
      },
      durationSeconds,
    );

    logRequest(req, res, routeLabel, durationMs);
  };

  res.once('finish', record);
  res.once('close', record);

  next();
};

const requiresMetricsAuth = () => !!(METRICS_BASIC_AUTH_USER && METRICS_BASIC_AUTH_PASS);

const validateMetricsAuth = (req) => {
  if (!requiresMetricsAuth()) {
    return true;
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Basic ')) {
    return false;
  }

  const [, encoded] = authHeader.split(' ');
  if (!encoded) {
    return false;
  }

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return false;
  }

  const user = decoded.substring(0, separatorIndex);
  const pass = decoded.substring(separatorIndex + 1);
  return user === METRICS_BASIC_AUTH_USER && pass === METRICS_BASIC_AUTH_PASS;
};

const metricsHandler = async (req, res) => {
  if (!METRICS_ENABLED) {
    return res.status(404).send('Not found');
  }

  if (requiresMetricsAuth() && !validateMetricsAuth(req)) {
    res.set('WWW-Authenticate', 'Basic realm="metrics"');
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  try {
    const metrics = await metricsRegistry.metrics();
    res.set('Content-Type', metricsRegistry.contentType);
    res.send(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failure', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ status: 'error', message: 'Failed to render metrics' });
  }
};

module.exports = {
  METRICS_ENABLED,
  requestObservabilityMiddleware,
  metricsHandler,
};
