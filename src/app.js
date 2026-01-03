// Configured Express application; index.js bootstraps runtime and attaches the server.
require('dotenv').config();

const express = require('express');
const { serve, setup } = require('swagger-ui-express');
const { createSecurityMiddleware } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { specs, swaggerOptions } = require('./config/swagger');
const appVersion = require('./config/appVersion');
const { createApiTimeoutMiddleware } = require('./middleware/apiTimeout');

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

const app = express();
const API_PREFIX = process.env.API_BASE_URL || '/api';

app.set('apiPrefix', API_PREFIX);

/*
 * v0.1 scope guard:
 * 1) Enabled: Auth (login/register), company/profile management, user CRUD, invoices,
 *    dashboard stats, bank statement import/list.
 * 2) Disabled: VAT/tax services, Stripe billing, German compliance/Elster exports.
 * 3) Out of scope: advanced analytics, OCR intelligence, multi-entity billing.
 * Disabled endpoints return 501 + {status:'disabled', version:'v0.1', feature:'...'}.
 */
/*
 * API surface v0.1 (all prefixed with API_PREFIX)
 * Public: POST /auth/login, POST /auth/register
 * Authenticated: GET /auth/me
 * Companies: GET /companies, PUT /companies
 * Users: GET/POST /users, PUT/DELETE /users/:userId
 * Invoices: GET/POST /invoices, PUT /invoices/:invoiceId
 * Dashboard: GET /dashboard/stats
 * Bank statements: GET /bank-statements, POST /bank-statements/import, GET /bank-statements/:id/transactions, POST /bank-statements/reconcile, PUT /bank-statements/transactions/:id/categorize
 */

if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// --- Middleware Order: requestId, CORS, Security, Rate/Security, Performance, Routes, ErrorHandler ---

const requestIdMiddleware = require('./middleware/requestId');
const corsMiddleware = require('./middleware/cors');
const { createPerformanceMiddleware, performanceMonitor } = require('./middleware/performance');

// 1. Request ID
app.use(requestIdMiddleware);

// 2. CORS
app.use(corsMiddleware);

// 3. Security (ordered)
createSecurityMiddleware().forEach((mw) => app.use(mw));

// 4. Performance/monitoring
createPerformanceMiddleware().forEach((mw) => app.use(mw));

// 5. Body parsers (after security, before routes)
app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || '10mb' }));

// 6. Docs and routes
app.use('/api/docs', serve, setup(specs, swaggerOptions));

// Health and observability endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: appVersion.version,
  });
});
// Readiness check ensures the primary database remains reachable.
app.get('/ready', async (req, res) => {
  try {
    await require('./models').sequelize.authenticate();
    res.status(200).json({
      status: 'ready',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'not-ready',
      db: 'disconnected',
      error: err.message,
    });
  }
});
// Minimal Prometheus endpoint to signal uptime.
app.get('/metrics', (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  const memory = metrics.memory || {};
  const cpu = metrics.cpu || {};
  const [load1 = 0, load5 = 0, load15 = 0] = metrics.load || [];
  const uptimeSeconds = typeof metrics.uptime === 'number' ? metrics.uptime : 0;

  const lines = [
    '# HELP smartaccounting_up 1 if up',
    '# TYPE smartaccounting_up gauge',
    'smartaccounting_up 1',
    '# HELP smartaccounting_requests_total Total requests seen since process start',
    '# TYPE smartaccounting_requests_total counter',
    `smartaccounting_requests_total ${metrics.requests}`,
    '# HELP smartaccounting_errors_total Total errors seen since process start',
    '# TYPE smartaccounting_errors_total counter',
    `smartaccounting_errors_total ${metrics.errors}`,
    '# HELP smartaccounting_avg_response_time_ms Average response time in ms',
    '# TYPE smartaccounting_avg_response_time_ms gauge',
    `smartaccounting_avg_response_time_ms ${metrics.averageResponseTime}`,
    '# HELP smartaccounting_slow_request_rate_percent Slow requests as a percentage',
    '# TYPE smartaccounting_slow_request_rate_percent gauge',
    `smartaccounting_slow_request_rate_percent ${metrics.slowRequestRate}`,
    '# HELP smartaccounting_error_rate_percent Errors as a percentage of requests',
    '# TYPE smartaccounting_error_rate_percent gauge',
    `smartaccounting_error_rate_percent ${metrics.errorRate}`,
    '# HELP smartaccounting_memory_rss_bytes Resident set size in bytes',
    '# TYPE smartaccounting_memory_rss_bytes gauge',
    `smartaccounting_memory_rss_bytes ${memory.rss || 0}`,
    '# HELP smartaccounting_memory_heap_used_bytes Heap used in bytes',
    '# TYPE smartaccounting_memory_heap_used_bytes gauge',
    `smartaccounting_memory_heap_used_bytes ${memory.heapUsed || 0}`,
    '# HELP smartaccounting_cpu_user_usec CPU user time in microseconds',
    '# TYPE smartaccounting_cpu_user_usec gauge',
    `smartaccounting_cpu_user_usec ${cpu.user || 0}`,
    '# HELP smartaccounting_cpu_system_usec CPU system time in microseconds',
    '# TYPE smartaccounting_cpu_system_usec gauge',
    `smartaccounting_cpu_system_usec ${cpu.system || 0}`,
    '# HELP smartaccounting_uptime_seconds Process uptime in seconds',
    '# TYPE smartaccounting_uptime_seconds gauge',
    `smartaccounting_uptime_seconds ${uptimeSeconds.toFixed(2)}`,
    '# HELP smartaccounting_load_avg_1m Load average over the last minute',
    '# TYPE smartaccounting_load_avg_1m gauge',
    `smartaccounting_load_avg_1m ${load1}`,
    '# HELP smartaccounting_load_avg_5m Load average over the last 5 minutes',
    '# TYPE smartaccounting_load_avg_5m gauge',
    `smartaccounting_load_avg_5m ${load5}`,
    '# HELP smartaccounting_load_avg_15m Load average over the last 15 minutes',
    '# TYPE smartaccounting_load_avg_15m gauge',
    `smartaccounting_load_avg_15m ${load15}`,
  ];

  res.set('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});
const telemetryRoutes = require('./routes/telemetry');
app.use(`${API_PREFIX}`, createApiTimeoutMiddleware());
app.use(`${API_PREFIX}/telemetry`, telemetryRoutes);

app.use(`${API_PREFIX}/auth`, authRoutes);
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
const aiRoutes = require('./routes/ai');
app.use(`${API_PREFIX}/ai`, aiRoutes);

const adminRoutes = require('./routes/admin');
app.use(`${API_PREFIX}/admin`, adminRoutes);
const gdprRoutes = require('./routes/gdpr');
app.use(`${API_PREFIX}/gdpr`, gdprRoutes);
app.use(`${API_PREFIX}/ocr`, ocrRoutes);
app.use(`${API_PREFIX}/system`, systemRoutes);
app.use(`${API_PREFIX}/monitoring`, monitoringRoutes);
app.use(`${API_PREFIX}/logs`, logRoutes);
app.use(`${API_PREFIX}/exports`, exportRoutes);
app.use(`${API_PREFIX}/email-test`, emailTestRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.use(errorHandler);

module.exports = app;
