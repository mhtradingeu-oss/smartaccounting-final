const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('../lib/logger');
const router = express.Router();

// Rate limiter: 10 requests per minute per IP
const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many telemetry events, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(telemetryLimiter);

// Utility: Remove likely PII fields from error payload
function sanitizeErrorPayload(payload) {
  // eslint-disable-next-line no-unused-vars -- stripped for PII safety
  const { error, stack, ...rest } = payload || {};
  // Drop any keys that look like email, name, address, token, password, etc.
  const piiKeys =
    /email|name|address|token|password|ssn|iban|bic|phone|user|company|session|auth|jwt/i;
  return Object.fromEntries(Object.entries(rest).filter(([k]) => !piiKeys.test(k)));
}

// POST /api/telemetry/client-error
router.post('/client-error', telemetryLimiter, (req, res) => {
  try {
    // eslint-disable-next-line no-unused-vars -- reserved for AI explainability / audit
    const { message, route, buildVersion, featureFlags, errorType, stack, ...rest } =
      req.body || {};
    // Only log minimal, non-PII info
    const sanitized = sanitizeErrorPayload({
      ...rest,
      message,
      route,
      buildVersion,
      featureFlags,
      errorType,
    });
    logger.warn('Client error event', {
      ...sanitized,
      channel: 'telemetry',
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Failed to process client telemetry', { error: err.message });
    res.status(500).json({ error: 'Failed to process telemetry' });
  }
});

module.exports = router;
