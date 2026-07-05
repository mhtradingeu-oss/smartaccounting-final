const { AIApprovalQueueItem } = require('../../models');

const serializeApprovalQueueItem = (item) => {
  const plain = typeof item?.get === 'function' ? item.get({ plain: true }) : item;

  if (!plain) {
    return null;
  }

  return {
    id: plain.approvalId || plain.id,
    approvalId: plain.approvalId,
    schemaVersion: plain.schemaVersion,
    status: plain.status,
    decision: plain.decision || null,
    toolId: plain.toolId,
    riskLevel: plain.riskLevel || null,
    executionMode: plain.executionMode || null,
    requiresApproval: Boolean(plain.requiresApproval),
    blocked: Boolean(plain.blocked),
    companyId: plain.companyId,
    requestedBy: plain.requestedBy || null,
    requestedByUserId: plain.requestedByUserId || null,
    approvalReason: plain.approvalReason || null,
    decisionReason: plain.decisionReason || null,
    decidedByUserId: plain.decidedByUserId || null,
    actionProposal: plain.actionProposal || null,
    metadata: plain.metadata || {},
    auditRequired: plain.auditRequired === true,
    createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : null,
    updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : null,
    expiresAt: plain.expiresAt ? new Date(plain.expiresAt).toISOString() : null,
    decidedAt: plain.decidedAt ? new Date(plain.decidedAt).toISOString() : null,
  };
};

const listApprovalQueueItems = async ({ companyId, limit = 50 } = {}) => {
  if (!companyId) {
    return [];
  }

  if (!AIApprovalQueueItem) {
    return [];
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const items = await AIApprovalQueueItem.findAll({
    where: { companyId },
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
  });

  return items.map(serializeApprovalQueueItem).filter(Boolean);
};

module.exports = {
  listApprovalQueueItems,
  serializeApprovalQueueItem,
};
