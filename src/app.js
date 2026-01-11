// Configured Express application; index.js bootstraps runtime and attaches the server.

require('dotenv').config();
// Environment variable validation (fail closed)
const { cleanEnv, str, num } = require('envalid');
const envSpec = {
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  API_BASE_URL: str({ default: '/api' }),
  PORT: num({ default: 3000 }),
  DB_HOST: str({ default: 'localhost' }),
  DB_USER: str({ default: 'testuser' }),
  DB_PASS: str({ default: 'testpass' }),
  DB_NAME: str({ default: 'testdb' }),
  JWT_SECRET: str({ default: 'testsecret' }),
  // Add other required env vars here as needed
};
if (process.env.NODE_ENV === 'production') {
  cleanEnv(process.env, envSpec);
} else {
  try {
    cleanEnv(process.env, envSpec, {
      reporter: ({ errors }) => {
        if (Object.keys(errors).length > 0) {
          // eslint-disable-next-line no-console
          console.warn('[envalid] Missing/invalid env vars (non-prod):', Object.keys(errors));
        }
      },
    });
  } catch (e) {
    // Do not exit in test/dev
  }
}

const express = require('express');
const { serve, setup } = require('swagger-ui-express');
const { cache } = require('./lib/cache');
const { sequelize } = require('./models');

const app = express();
const API_PREFIX = process.env.API_BASE_URL || '/api';
app.set('apiPrefix', API_PREFIX);
const normalizedApiPrefix = API_PREFIX.replace(/\/$/, '');

const registerPublicMonitorEndpoint = (path, handler) => {
  app.get(path, handler);
  if (normalizedApiPrefix) {
    app.get(`${normalizedApiPrefix}${path}`, handler);
  }
};

// --------------------------------------------------
// Core imports
// --------------------------------------------------
const authMiddleware = require('./middleware/authMiddleware');
const permissionGuard = require('./security/permissionGuard');
const errorHandler = require('./middleware/errorHandler');
const { createSecurityMiddleware } = require('./middleware/security');
const { createPerformanceMiddleware, performanceMonitor } = require('./middleware/performance');
const { createApiTimeoutMiddleware } = require('./middleware/apiTimeout');
const { maintenanceMiddleware } = require('./middleware/maintenanceMode');
const { specs, swaggerOptions } = require('./config/swagger');
const appVersion = require('./config/appVersion');
const ApiError = require('./lib/errors/apiError');

const getCacheStatus = () => {
  if (!cache || typeof cache.getStats !== 'function') {
    return { redis: 'not_configured' };
  }

  try {
    const stats = cache.getStats();
    return {
      redis: stats.redisStatus || 'unknown',
      hits: stats.hits ?? 0,
      misses: stats.misses ?? 0,
      hitRate: stats.hitRate || '0%',
    };
  } catch (error) {
    return { redis: 'error', error: error.message };
  }
};

const getQueueStatus = () => ({
  name: 'background',
  status: 'not_configured',
  detail: 'No asynchronous queue client has been configured in this deployment.',
});

// --------------------------------------------------
// Routes
// --------------------------------------------------
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const invoiceRoutes = require('./routes/invoices');
const bankStatementRoutes = require('./routes/bankStatements');
const germanTaxRoutes = require('./routes/germanTax');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/users');
const stripeRoutes = require('./routes/stripe');
const taxReportRoutes = require('./routes/taxReports');
const systemRoutes = require('./routes/system');
const monitoringRoutes = require('./routes/monitoring');
const complianceRoutes = require('./routes/compliance');
const elsterRoutes = require('./routes/elster');
const ocrRoutes = require('./routes/ocr');
const logRoutes = require('./routes/logs');
const exportRoutes = require('./routes/exports');
const emailTestRoutes = require('./routes/emailTest');
const germanTaxComplianceRoutes = require('./routes/germanTaxCompliance');
const expenseRoutes = require('./routes/expenses');
const telemetryRoutes = require('./routes/telemetry');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const gdprRoutes = require('./routes/gdpr');
const publicRoutes = require('./routes/public');

// --------------------------------------------------
// Proxy / Trust
// --------------------------------------------------
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// --------------------------------------------------
// Middleware Order (FINAL & APPROVED)
// --------------------------------------------------

// 1. Request ID
const requestIdMiddleware = require('./middleware/requestId');
app.use(requestIdMiddleware);

// 2. CORS
const corsMiddleware = require('./middleware/cors');
app.use(corsMiddleware);
app.options('*', corsMiddleware);

// 3. Security headers, rate limits, etc.
createSecurityMiddleware().forEach((mw) => app.use(mw));

// 4. Performance / monitoring
createPerformanceMiddleware().forEach((mw) => app.use(mw));

// 5. Body parsers
app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || '10mb' }));

// --------------------------------------------------
// Public / Unprotected endpoints
// --------------------------------------------------

// Swagger docs
const swaggerDocsPath = `${API_PREFIX}/docs`;
app.use(swaggerDocsPath, serve, setup(specs, swaggerOptions));

const healthHandler = async (req, res) => {
  const timestamp = new Date().toISOString();
  const cacheStatus = getCacheStatus();
  const queueStatus = getQueueStatus();
  let dbStatus = 'unknown';
  let dbError;

  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
    dbError = err.message;
  }

  const payload = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    environment: process.env.NODE_ENV || 'development',
    timestamp,
    version: appVersion.version,
    db: { status: dbStatus },
    cache: cacheStatus,
    queue: queueStatus,
  };

  if (dbError) {
    payload.db.error = dbError;
  }

  if (dbStatus === 'connected') {
    res.status(200).json(payload);
  } else {
    res.status(503).json(payload);
  }
};

const readyHandler = async (req, res) => {
  const timestamp = new Date().toISOString();
  const cacheStatus = getCacheStatus();
  const queueStatus = getQueueStatus();

  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'ready',
      environment: process.env.NODE_ENV || 'development',
      timestamp,
      version: appVersion.version,
      db: 'connected',
      cache: cacheStatus,
      queue: queueStatus,
    });
  } catch (err) {
    res.status(503).json({
      status: 'not-ready',
      environment: process.env.NODE_ENV || 'development',
      timestamp,
      version: appVersion.version,
      db: 'disconnected',
      cache: cacheStatus,
      queue: queueStatus,
      error: err.message,
    });
  }
};

app.use(`${API_PREFIX}/public`, publicRoutes);

const metricsHandler = (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  const memory = metrics.memory || {};
  const cpu = metrics.cpu || {};
  const [load1 = 0, load5 = 0, load15 = 0] = metrics.load || [];
  const uptimeSeconds = typeof metrics.uptime === 'number' ? metrics.uptime : 0;

  const lines = [
    '# HELP smartaccounting_up 1 if up',
    '# TYPE smartaccounting_up gauge',
    'smartaccounting_up 1',

    `smartaccounting_requests_total ${metrics.requests}`,

    `smartaccounting_errors_total ${metrics.errors}`,

    `smartaccounting_avg_response_time_ms ${metrics.averageResponseTime}`,

    `smartaccounting_slow_request_rate_percent ${metrics.slowRequestRate}`,

    `smartaccounting_error_rate_percent ${metrics.errorRate}`,

    `smartaccounting_memory_rss_bytes ${memory.rss || 0}`,

    `smartaccounting_memory_heap_used_bytes ${memory.heapUsed || 0}`,

    `smartaccounting_cpu_user_usec ${cpu.user || 0}`,

    `smartaccounting_cpu_system_usec ${cpu.system || 0}`,

    `smartaccounting_uptime_seconds ${uptimeSeconds.toFixed(2)}`,

    `smartaccounting_load_avg_1m ${load1}`,

    `smartaccounting_load_avg_5m ${load5}`,

    `smartaccounting_load_avg_15m ${load15}`,
  ];

  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
};

registerPublicMonitorEndpoint('/health', healthHandler);
registerPublicMonitorEndpoint('/ready', readyHandler);
registerPublicMonitorEndpoint('/metrics', metricsHandler);

// --------------------------------------------------
// API-wide middlewares (protected)
// --------------------------------------------------

// Timeout only for API
app.use(API_PREFIX, createApiTimeoutMiddleware());

// Mount public auth routes BEFORE authentication middleware
app.use(`${API_PREFIX}/auth`, authRoutes);

// Authentication & RBAC (protect all other /api routes)
app.use(API_PREFIX, authMiddleware.authenticate);
app.use(API_PREFIX, permissionGuard());
app.use(API_PREFIX, maintenanceMiddleware);

// --------------------------------------------------
// API Routes
// --------------------------------------------------
app.use(`${API_PREFIX}/telemetry`, telemetryRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/bank-statements`, bankStatementRoutes);
app.use(`${API_PREFIX}/german-tax`, germanTaxRoutes);
app.use(`${API_PREFIX}/stripe`, stripeRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/companies`, companyRoutes);
app.use(`${API_PREFIX}/tax-reports`, taxReportRoutes);
app.use(`${API_PREFIX}/compliance`, complianceRoutes);
app.use(`${API_PREFIX}/german-tax-compliance`, germanTaxComplianceRoutes);
app.use(`${API_PREFIX}/elster`, elsterRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/gdpr`, gdprRoutes);
app.use(`${API_PREFIX}/ocr`, ocrRoutes);
app.use(`${API_PREFIX}/system`, systemRoutes);
app.use(`${API_PREFIX}/monitoring`, monitoringRoutes);
app.use(`${API_PREFIX}/logs`, logRoutes);
app.use(`${API_PREFIX}/exports`, exportRoutes);
app.use(`${API_PREFIX}/email-test`, emailTestRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.get(`${API_PREFIX}/ai/suggest`, (req, res, next) => {
  return next(new ApiError(501, 'AI_SUGGEST_NOT_READY', 'AI suggestions are not production-ready'));
});

// --------------------------------------------------
// Fallback & Error handling
// --------------------------------------------------
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.use(errorHandler);

module.exports = app;
