// Configured Express application; index.js bootstraps runtime and attaches the server.
require('dotenv').config();

const express = require('express');
const { serve, setup } = require('swagger-ui-express');
const { createSecurityMiddleware } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { specs, swaggerOptions } = require('./config/swagger');
const appVersion = require('./config/appVersion');

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
const { createPerformanceMiddleware } = require('./middleware/performance');

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
  res.set('Content-Type', 'text/plain');
  res.send(
    '# HELP smartaccounting_up 1 if up\n# TYPE smartaccounting_up gauge\nsmartaccounting_up 1\n',
  );
});
const telemetryRoutes = require('./routes/telemetry');
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

const originalListen = app.listen.bind(app);
app.listen = function (port, ...args) {
  if (!args.length || typeof args[0] === 'function') {
    return originalListen(port, '127.0.0.1', ...args);
  }
  return originalListen(port, ...args);
};

if (process.env.NODE_ENV === 'test') {
  const http = require('http');
  const originalServerListen = http.Server.prototype.listen;
  http.Server.prototype.listen = function (port, ...args) {
    if (typeof port === 'number' && (args.length === 0 || typeof args[0] === 'function')) {
      return originalServerListen.call(this, port, '127.0.0.1', ...args);
    }
    return originalServerListen.call(this, port, ...args);
  };
}

module.exports = app;
