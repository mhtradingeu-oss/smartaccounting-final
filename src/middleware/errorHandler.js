// Canonical Express error handler: logs failures and responds with a consistent, safe shape.

const logger = require('../lib/logger');
const telemetry = require('../services/telemetry');
const ApiError = require('../lib/errors/apiError');

function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let code = err.code || err.errorCode || 'INTERNAL_ERROR';
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  // Recognize ApiError
  if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SequelizeValidationError' && Array.isArray(err.errors)) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map((e) => e.message);
  } else if (err.name === 'SequelizeUniqueConstraintError' && Array.isArray(err.errors)) {
    status = 409;
    code = 'DUPLICATE_VALUE';
    message = 'Duplicate value violation';
    details = err.errors.map((e) => e.message);
  } else if (err instanceof Error) {
    details = [err.message];
  }

  // Telemetry for 5xx errors
  if (status >= 500) {
    telemetry.reportError({
      error: err,
      requestId: req.requestId,
      userId: req.userId,
      companyId: req.companyId,
      route: req.originalUrl,
      status,
      errorCode: code,
      details,
    });
    logger.error(message, { code, status, details, requestId: req.requestId });
  } else if (status >= 400) {
    logger.warn(message, { code, status, details, requestId: req.requestId });
  }

  res.status(status).json({
    error: true,
    message,
    errorCode: code,
    requestId: req.requestId || null,
    ...(details ? { details } : {}),
  });
}

module.exports = errorHandler;
