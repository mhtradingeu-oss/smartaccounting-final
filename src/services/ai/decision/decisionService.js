// Service for AI Decision logic
const { AIInsight, AIInsightDecision } = require('../../../models');
const AuditLogService = require('../../auditLogService');

function isAIDecisionEnabled() {
  // TODO: Replace with real feature flag check
  return process.env.AI_DECISION_ENABLED !== 'false';
}

async function createDecision({ insightId, user, body, requestId }) {
  const insight = await AIInsight.findOne({ where: { id: insightId, companyId: user.companyId } });
  if (!insight) {throw Object.assign(new Error('Insight not found'), { status: 404 });}

  // Enforce one decision per insight per user
  const existing = await AIInsightDecision.findOne({ where: { insightId, actorUserId: user.id } });
  if (existing) {throw Object.assign(new Error('Decision already exists'), { status: 409 });}

  const decision = await AIInsightDecision.create({
    insightId,
    companyId: user.companyId,
    actorUserId: user.id,
    decision: body.decision,
    reason: body.reason,
  });

  await AuditLogService.appendEntry({
    action: 'ai_decision',
    resourceType: 'AIInsight',
    resourceId: insightId,
    newValues: {
      decision: body.decision,
      reason: body.reason,
      requestId,
    },
    userId: user.id,
    reason: body.reason || 'AI decision',
  });

  return decision;
}

module.exports = {
  isAIDecisionEnabled,
  createDecision,
};
