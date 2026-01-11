const express = require('express');
const rateLimit = require('express-rate-limit');
const ApiError = require('../lib/errors/apiError');
const logger = require('../lib/logger');
const { authenticate } = require('../middleware/authMiddleware');
const router = express.Router();

// Rate limiter: 10 requests per minute per IP
const logsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many log events, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(logsLimiter);
router.use(authenticate);

// Allowlist fields for logs
const ALLOWED_FIELDS = [
  'level',
  'message',
  'timestamp',
  'url',
  'route',
  'buildVersion',
  'stackHash',
  'context',
];
const FORBIDDEN_KEYS =
  /email|name|address|token|password|iban|bic|phone|user|company|session|auth|jwt/i;

function sanitizeContext(obj) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeContext);
  }
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.test(k)) {
      continue;
    }
    if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeContext(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function sanitizeLogBody(body) {
  const sanitized = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      if (key === 'context') {
        sanitized.context = sanitizeContext(body.context);
      } else {
        sanitized[key] = body[key];
      }
    }
  }
  return sanitized;
}

router.post('/', authenticate, logsLimiter, (req, res, next) => {
  try {
    const sanitized = sanitizeLogBody(req.body || {});
    // Never log forbidden keys at top level
    for (const k of Object.keys(sanitized)) {
      if (FORBIDDEN_KEYS.test(k)) {
        delete sanitized[k];
      }
    }
    const level = sanitized.level || 'info';
    const message = sanitized.message || 'Log event';
    const meta = {
      ...sanitized,
      frontend: true,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };
    delete meta.level;
    delete meta.message;
    switch (level) {
      case 'error':
        logger.error(message, meta);
        break;
      case 'warn':
        logger.warn(message, meta);
        break;
      case 'info':
        logger.info(message, meta);
        break;
      default:
        logger.debug(message, meta);
    }
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to process frontend log', { error: error.message });
    next(new ApiError(500, 'Failed to process log', 'LOG_PROCESS_ERROR'));
  }
});

module.exports = router;
