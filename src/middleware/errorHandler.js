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

const formatErrorDetails = (errorList = []) => errorList.map((el) => el.message);

const errorHandler = (err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Server error';
  let code = err.code;
  let details;

  const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';

  const operationalTags = [];

  // ---------- Known / operational errors ----------
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    code ||= 'VALIDATION_ERROR';
    details = formatErrorDetails(Object.values(err.errors));
    operationalTags.push('validation');
  }

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Database validation error';
    code ||= 'DB_VALIDATION_ERROR';
    details = formatErrorDetails(err.errors);
    operationalTags.push('sequelize-validation');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code ||= 'INVALID_TOKEN';
    operationalTags.push('jwt');
  }

  // ---------- Production message hardening ----------
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Server error';
  }

  const isOperational =
    err.isOperational === true || statusCode < 500 || operationalTags.length > 0;

  // ---------- Logging ----------
  const logPayload = {
    requestId,
    message: err.message,
    code,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...(isOperational ? {} : { stack: err.stack }),
  };

  logger[isOperational ? 'warn' : 'error']('Unhandled error', logPayload);

  // ---------- Telemetry (5xx only, safe fields only) ----------
  if (telemetryReporter && !isOperational && TELEMETRY_ENABLED) {
    try {
      telemetryReporter.reportError({
        requestId,
        route: req.route?.path || req.originalUrl,
        method: req.method,
        statusCode,
        service: 'api',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Telemetry must never break the app
    }
  }

  // ---------- Client response ----------
  const response = {
    status: 'error',
    message,
    requestId,
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
