const rateLimit = require('express-rate-limit');

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    message: message || {
      success: false,
      message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

const loginLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
  },
});

const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
  },
});

const ocrLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many OCR submissions, please try again later',
  },
});

const elsterLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many ELSTER requests, please try again later',
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  ocrLimiter,
  elsterLimiter,
};
