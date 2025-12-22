const express = require('express');
const emailService = require('../services/emailService');
const EmailValidation = require('../utils/emailValidation');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { sendSuccess, sendError } = require('../utils/responseHelpers');
const logger = require('../lib/logger');

const router = express.Router();
const requireAdmin = requireRole(['admin']);

const ensureEmail = (value) => {
  if (!EmailValidation.validateEmailFormat(value)) {
    throw new Error('Invalid email address');
  }
  return true;
};

router.use(authenticate);

router.get('/test-config', requireAdmin, (req, res) => {
  try {
    const validation = EmailValidation.validateEnvironment();
    return sendSuccess(res, 'Email configuration validated', {
      isConfigured: emailService.isConfigured,
      validation: {
        ...validation,
        configuration: {
          ...validation.configuration,
          user: EmailValidation.sanitizeEmailForLog(validation.configuration?.user),
        },
      },
    });
  } catch (error) {
    logger.error('Email configuration test failed', { error: error.message });
    return sendError(res, error.message, 500);
  }
});

router.post('/test-connection', requireAdmin, async (_, res) => {
  try {
    const result = await emailService.testConnection();
    return sendSuccess(res, 'Connection test completed', { result });
  } catch (error) {
    logger.error('Email connection test failed', { error: error.message });
    return sendError(res, error.message, 500);
  }
});

router.post('/send-test', requireAdmin, async (req, res) => {
  try {
    const to = req.body.to || req.user.email;
    ensureEmail(to);

    const result = await emailService.sendTestEmail(to);
    return sendSuccess(res, 'Test email sent', { result });
  } catch (error) {
    logger.error('Send test email failed', { error: error.message });
    return sendError(res, error.message, 400);
  }
});

router.post('/test-template/:type', requireAdmin, async (req, res) => {
  try {
    const to = req.body.to || req.user.email;
    ensureEmail(to);

    const companyName = req.user.company?.name || 'Test Company GmbH';
    const templateType = req.params.type;
    let result;

    switch (templateType) {
      case 'tax-deadline':
        result = await emailService.sendTaxDeadlineAlert(
          to,
          companyName,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
          'Test Umsatzsteuer-Voranmeldung',
        );
        break;
      case 'invoice':
        result = await emailService.sendNewInvoiceAlert(
          to,
          companyName,
          'TEST-INV-2024-001',
          '1,234.56',
        );
        break;
      case 'subscription':
        result = await emailService.sendSubscriptionExpiryAlert(
          to,
          companyName,
          'Professional',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
          7,
        );
        break;
      default:
        return sendError(res, 'Invalid template type', 400);
    }

    return sendSuccess(res, 'Template email sent', { result });
  } catch (error) {
    logger.error('Template email failed', { error: error.message });
    return sendError(res, error.message, 400);
  }
});

module.exports = router;
