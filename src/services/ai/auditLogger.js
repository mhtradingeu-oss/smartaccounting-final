// AI audit logging for all insights and user actions
const { AuditLog } = require('../../models');

/**
 * Log an AI insight or user decision (GoBD-compliant)
 * @param {Object} params
 * @param {string} params.entityType - e.g. 'invoice', 'expense', 'vat', 'ai_suggestion'
 * @param {string|number} params.entityId
 * @param {string} params.action - 'AI_SUGGEST', 'USER_ACCEPT', 'USER_REJECT'
 * @param {Object} params.aiOutput - The AI output (with explainability)
 * @param {string} params.userId
 * @param {string} params.aiVersion
 * @param {string} [params.reason] - Optional rejection/override reason
 */
async function logAIEvent({ entityType, entityId, action, aiOutput, userId, aiVersion, reason }) {
  await AuditLog.create({
    resourceType: entityType || 'ai_suggestion',
    resourceId: entityId ? String(entityId) : null,
    action,
    userId: userId === null || userId === undefined ? 0 : userId, // fallback to 0 for system/AI events
    newValues: aiOutput ? { aiOutput, aiVersion, reason } : null,
    hash: '',
    previousHash: null,
    immutable: true,
    timestamp: new Date(),
    reason: reason || action,
  });
}

module.exports = { logAIEvent };
