// DEV-only whitelist for rate limiting
function shouldSkipRateLimit(req) {
  if (process.env.NODE_ENV !== 'production') {
    const whitelist = ['/api/companies', '/api/health', '/api/ready'];
    if (whitelist.includes(req.originalUrl.split('?')[0])) {
      return true;
    }
  }
  return false;
}
const rateLimit = require('express-rate-limit');

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const createLimiter = ({ windowMs, max, message, skip }) =>
  rateLimit({
    windowMs,
    max,
    message: message || {
      success: false,
      message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: typeof skip === 'function' ? skip : () => false,
  });

const isAuthRateLimitDisabled = () => process.env.AUTH_RATE_LIMIT_DISABLED === 'true';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const defaultAuthWindowMs = isProduction ? 5 * 60 * 1000 : 15 * 60 * 1000;
const defaultAuthMaxAttempts = isProduction ? 5 : 20;

const authWindowMs = toInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
  defaultAuthWindowMs,
);
const authMaxAttempts = toInt(
  process.env.AUTH_RATE_LIMIT_MAX ?? process.env.LOGIN_RATE_LIMIT_MAX,
  defaultAuthMaxAttempts,
);

const loginLimiter = createLimiter({
  windowMs: authWindowMs,
  max: authMaxAttempts,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
  },
  skip: (req) => isAuthRateLimitDisabled() || shouldSkipRateLimit(req),
});

const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
  },
  skip: shouldSkipRateLimit,
});

const ocrLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many OCR submissions, please try again later',
  },
  skip: shouldSkipRateLimit,
});

const elsterLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many ELSTER requests, please try again later',
  },
  skip: shouldSkipRateLimit,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  ocrLimiter,
  elsterLimiter,
  resetAuthRateLimit: (key) => {
    if (loginLimiter && typeof loginLimiter.resetKey === 'function') {
      loginLimiter.resetKey(key || '');
    }
  },
};
