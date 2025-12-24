// Canonical Express error handler: logs failures and responds with a consistent shape.
const logger = require('../lib/logger');
const sentry = require('../lib/sentry');

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

const formatErrorDetails = (errorList = []) => errorList.map((el) => el.message);

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Server error';
  let code = err.code;
  let details;

  const operationalError = [];

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    code = code || 'VALIDATION_ERROR';
    details = formatErrorDetails(Object.values(err.errors));
    operationalError.push('validation');
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Database validation error';
    code = code || 'DB_VALIDATION_ERROR';
    details = formatErrorDetails(err.errors);
    operationalError.push('sequelize-validation');
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = code || 'INVALID_TOKEN';
    operationalError.push('jwt');
  }

  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Server error';
  }

  const isOperational =
    err.isOperational ||
    statusCode < 500 ||
    operationalError.length > 0;

  const routeLabel = resolveRouteLabel(req);
  const logPayload = {
    error: err.message,
    code,
    url: req.originalUrl,
    method: req.method,
    route: routeLabel,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode,
    ...(isOperational ? {} : { stack: err.stack }),
  };

  const logLevel = isOperational ? 'warn' : 'error';
  logger[logLevel]('Unhandled error', logPayload);

  const response = {
    status: 'error',
    message,
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  if (!isOperational) {
    sentry.captureException(err, {
      requestId: req.requestId,
      userId: req.userId || req.user?.id,
      companyId: req.companyId || req.user?.companyId,
      method: req.method,
      path: req.originalUrl,
      route: routeLabel,
      statusCode,
    });
  }

  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
