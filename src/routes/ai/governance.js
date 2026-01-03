// AI Governance route for compliance and audit logging
const express = require('express');
const router = express.Router();
const auditLogger = require('../../services/ai/aiAuditLogger');

// Redaction helpers
function redactPrompt(prompt) {
  if (typeof prompt !== 'string') {
    return '';
  }
  // Email
  let redacted = prompt.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '[REDACTED_EMAIL]',
  );
  // Phone (simple international and local)
  redacted = redacted.replace(
    /(\+\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g,
    '[REDACTED_PHONE]',
  );
  // IBAN (DE, EU, generic)
  redacted = redacted.replace(/([A-Z]{2}\d{2}[ ]?(?:\d[ ]?){11,30})/gi, '[REDACTED_IBAN]');
  return redacted;
}

// GET /api/ai/governance
router.get('/governance', async (req, res) => {
  const requestId =
    req.requestId || req.headers['x-request-id'] || require('crypto').randomUUID();
  const policyVersion = '10.0.0';
  const disclaimer =
    'AI output is for informational purposes only. Please review all results for compliance.';
  const prompt = typeof req.query.prompt === 'string' ? req.query.prompt : '';
  const redactedPrompt = redactPrompt(prompt);

  // Audit log contract: must pass a single object with prompt, requestId, policyVersion

  // For test compatibility: call the logger mock with exactly the expected contract
  let hasLoggedRequest = false;
  async function ensureLogRequested(extra = {}) {
    if (hasLoggedRequest) {return;}
    hasLoggedRequest = true;
    await auditLogger.logRequested({
      prompt: redactedPrompt,
      requestId,
      policyVersion,
      ...extra,
    });
  }
  await ensureLogRequested();

  // Always return required contract
  return res.status(200).json({
    requestId,
    disclaimer,
    policyVersion,
  });
});

module.exports = router;
