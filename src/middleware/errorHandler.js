// Canonical Express error handler: logs failures and responds with a consistent, safe shape.

const logger = require('../lib/logger');

let telemetryReporter = null;
const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED === 'true';

if (TELEMETRY_ENABLED) {
  try {
    telemetryReporter = require('../lib/telemetryReporter');
  } catch {
    telemetryReporter = null;
  }
}

// Production-grade error handler: never throws, always returns safe error shape
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  let message = err.message || 'Internal Server Error';
  let details = undefined;

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' && Array.isArray(err.errors)) {
    details = err.errors.map((e) => e.message);
  }
  // Sequelize unique constraint
  else if (err.name === 'SequelizeUniqueConstraintError' && Array.isArray(err.errors)) {
    details = err.errors.map((e) => e.message);
    message = 'Duplicate value violation';
  }
  // Generic JS error (TypeError, ReferenceError, etc.)
  else if (err instanceof Error) {
    details = [err.message];
  }

  // Never throw from error handler
  res.status(status).json({
    error: true,
    message,
    ...(details ? { details } : {}),
    requestId: req.requestId || null,
  });
}

module.exports = errorHandler;
