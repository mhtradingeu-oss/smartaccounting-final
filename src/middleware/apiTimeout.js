const logger = require('../lib/logger');
const ApiError = require('../lib/errors/apiError');

const API_PREFIX = process.env.API_BASE_URL || '/api';

const DEFAULT_TIMEOUT_MS = Number(process.env.API_REQUEST_TIMEOUT_MS) || 500;
const DASHBOARD_TIMEOUT_MS = Number(process.env.DASHBOARD_REQUEST_TIMEOUT_MS) || 800;

const TIMEOUT_OVERRIDES = [
  {
    prefix: `${API_PREFIX}/dashboard`,
    timeoutMs: DASHBOARD_TIMEOUT_MS,
  },
];

const resolveTimeoutMs = (req, overrides, defaultMs = DEFAULT_TIMEOUT_MS) => {
  const base = req.baseUrl || '';
  const path = req.path || '';
  const requestPath = `${base}${path}` || req.originalUrl || '';
  const override = (overrides || TIMEOUT_OVERRIDES).find((entry) =>
    requestPath.startsWith(entry.prefix),
  );
  return override?.timeoutMs ?? defaultMs;
};

const preventPostTimeoutWrites = (res, hasTimedOutRef) => {
  ['send', 'json', 'end'].forEach((methodName) => {
    if (typeof res[methodName] !== 'function') {
      return;
    }

    const original = res[methodName].bind(res);
    res[methodName] = (...args) => {
      if (hasTimedOutRef.value) {
        return res;
      }
      return original(...args);
    };
  });
};

const createApiTimeoutMiddleware = (options = {}) => {
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const overrides = options.overrides ?? TIMEOUT_OVERRIDES;

  return (req, res, next) => {
    const timeoutMs = resolveTimeoutMs(req, overrides, defaultTimeoutMs);
    res.set('X-API-Timeout', `${timeoutMs}ms`);

    const timeoutState = { value: false };
    const requestId = req.requestId || req.headers['x-request-id'] || 'unknown';

    const timedOut = () => {
      if (res.headersSent) {
        timeoutState.value = true;
        return;
      }

      logger.warn('API request exceeded timeout threshold', {
        timeoutMs,
        route: `${req.baseUrl}${req.path}`,
        requestId,
        method: req.method,
        userId: req.user?.id,
      });

      timeoutState.value = true;
      return next(
        new ApiError(504, 'REQUEST_TIMEOUT', 'Request timed out', { timeoutMs, requestId }),
      );
    };

    const timer = setTimeout(timedOut, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
    };

    preventPostTimeoutWrites(res, timeoutState);

    res.once('finish', cleanup);
    res.once('close', cleanup);
    req.once('aborted', cleanup);

    next();
  };
};

module.exports = {
  createApiTimeoutMiddleware,
};
