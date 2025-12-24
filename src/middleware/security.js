// Middleware to validate Content-Type header
function validateContentType(allowedTypes) {
  return function (req, res, next) {
    const contentType = req.headers['content-type'];
    if (!contentType) {
      return next();
    }
    if (allowedTypes.some(type => contentType.includes(type))) {
      return next();
    }
    return res.status(415).json({
      success: false,
      message: `Unsupported Content-Type. Allowed: ${allowedTypes.join(', ')}`,
    });
  };
}

// Middleware to limit request body size
function requestSizeLimiter(limit = '10mb') {
  // Use express.json and express.urlencoded with limit
  const express = require('express');
  const jsonParser = express.json({ limit });
  const urlencodedParser = express.urlencoded({ extended: true, limit });
  return function (req, res, next) {
    jsonParser(req, res, (err) => {
      if (err) {
        return res.status(413).json({
          success: false,
          message: 'Request body too large',
        });
      }
      urlencodedParser(req, res, (err2) => {
        if (err2) {
          return res.status(413).json({
            success: false,
            message: 'Request body too large',
          });
        }
        next();
      });
    });
  };
}
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { validationResult } = require('express-validator');
const logger = require('../lib/logger');

const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    skip: (req) => ['/health', '/ready', '/metrics'].includes(req.path),
    ...options,
  };
  return rateLimit(defaults);
};
const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '5 minutes',
  },
});

const apiRateLimiter = createRateLimiter({
  max: 100,
  message: {
    error: 'Too many API requests, please try again later.',
    retryAfter: '15 minutes',
  },
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour',
  },
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500,
});

const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL;

const isProduction = NODE_ENV === 'production';

const scriptSrc = ['\'self\''];
if (!isProduction) {
  // Swagger UI and dev tooling sometimes require inline/eval scripts
  scriptSrc.push('\'unsafe-inline\'', '\'unsafe-eval\'');
}

const styleSrc = ['\'self\'', 'https:'];
if (!isProduction) {
  styleSrc.push('\'unsafe-inline\'');
}

const connectSrc = ['\'self\''];
if (FRONTEND_URL) {
  connectSrc.push(FRONTEND_URL);
}
if (!isProduction) {
  connectSrc.push('ws:', 'wss:');
}

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc,
      styleSrc,
      imgSrc: ['\'self\'', 'data:', 'https:'],
      connectSrc,
      fontSrc: ['\'self\''],
      objectSrc: ['\'none\''],
      frameAncestors: ['\'none\''],
      mediaSrc: ['\'self\''],
      baseUri: ['\'self\''],
      formAction: ['\'self\''],
    },
  },
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  contentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  permissionsPolicy: {
    features: {
      geolocation: [],
      microphone: [],
      camera: [],
      fullscreen: [],
      payment: [],
      syncXHR: [],
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
      ambientLightSensor: [],
      autoplay: [],
    },
  },
});


const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((value) => sanitizeObject(value));
  }
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key] = sanitizeObject(value);
    return acc;
  }, {});
};

const sanitizeString = (value) => {
  if (typeof value !== 'string') {return value;}

  return value
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

const validateRequest = (validations) => async (req, res, next) => {
  for (const validation of validations) {
    await validation.run(req);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  next();
};

// reserved for Phase 10 (advanced security policies)
// eslint-disable-next-line no-unused-vars
const ipWhitelist = (allowedIPs = []) => (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (allowedIPs.length && !allowedIPs.includes(clientIP)) {
    logger.warn('Blocked request from unauthorized IP', { ip: clientIP });
    return res.status(403).json({
      success: false,
      message: 'Access denied from your IP address',
    });
  }

  next();
};

// reserved for CSRF hardening phase
// eslint-disable-next-line no-unused-vars
const csrfProtection = (req, res, next) => {
  if (req.method === 'GET' || req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed',
    });
  }

  next();
};


// Factory: returns ordered array of security middleware, preserving all logic and order
function createSecurityMiddleware() {
  // Helper to wrap path-scoped middleware
  function pathScopedMiddleware(path, mw) {
    return function (req, res, next) {
      if (req.path === path) {
        return mw(req, res, next);
      }
      return next();
    };
  }
  // Helper for prefix-scoped middleware
  function prefixScopedMiddleware(prefix, mw) {
    return function (req, res, next) {
      if (req.path.startsWith(prefix)) {
        return mw(req, res, next);
      }
      return next();
    };
  }
  return [
    securityHeaders,
    mongoSanitize(),
    xss(),
    hpp({ whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'status'] }),
    compression(),
    sanitizeRequest,
    validateContentType(['application/json', 'multipart/form-data']),
    requestSizeLimiter('10mb'),
    pathScopedMiddleware('/api/auth/login', authRateLimiter),
    pathScopedMiddleware('/api/auth/register', authRateLimiter),
    pathScopedMiddleware('/api/auth/forgot-password', authRateLimiter),
    pathScopedMiddleware('/api/invoices/upload', uploadRateLimiter),
    pathScopedMiddleware('/api/ocr/extract', uploadRateLimiter),
    prefixScopedMiddleware('/api', speedLimiter),
    prefixScopedMiddleware('/api', apiRateLimiter),
    // Security headers
    (req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      res.removeHeader('X-Powered-By');
      next();
    },
    // Timeout handler
    (req, res, next) => {
      if (req.path.includes('/upload')) {
        req.setTimeout(300000);
      } else {
        req.setTimeout(30000);
      }
      next();
    },
  ];
}


module.exports = {
  createSecurityMiddleware,
  validateRequest,
  securityHeaders,
  // ...other exports if needed
};
