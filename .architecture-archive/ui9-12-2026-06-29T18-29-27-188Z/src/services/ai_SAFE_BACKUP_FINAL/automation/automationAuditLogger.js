// automationAuditLogger.js
// Logs every automation trigger, suggestion, and dismissal for full auditability.

// Logs automation events (no PII, no raw prompts)
const { logSuggestionEvent } = require('../aiAuditLogger');
const crypto = require('crypto');

/**
 * Hashes input for safe logging (no PII)
 * @param {string} input
 * @returns {string}
 */
function safeHash(input) {
  return crypto.createHash('sha256').update(input || '').digest('hex').slice(0, 12);
}

/**
 * Logs an automation event (company-scoped, no PII)
 * @param {Object} param0
 * @param {string} param0.eventType
 * @param {string|number} param0.userId
 * @param {string|number} param0.companyId
 * @param {string} [param0.detector]
 * @param {Object} [param0.meta] - Only safe summaries/hashes
 */
async function logAutomationEvent({ eventType, userId, companyId, requestId, detector, meta }) {
  await logSuggestionEvent({
    eventType,
    userId,
    companyId,
    requestId,
    detector,
    createdAt: new Date(),
    action: eventType,
    resourceType: 'AI_AUTOMATION',
    relatedEntityId: meta && meta.relatedEntityId ? meta.relatedEntityId : null,
    severity: meta && meta.severity ? meta.severity : undefined,
    queryType: meta && meta.queryType ? meta.queryType : undefined,
    summary: meta && meta.summary ? meta.summary : undefined,
  });
}

module.exports = {
  logAutomationEvent,
  safeHash,
};
