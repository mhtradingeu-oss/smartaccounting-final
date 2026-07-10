const { AIApprovalQueueItem } = require('../../models');
const {
  AI_APPROVAL_DECISIONS,
  AI_APPROVAL_STATUSES,
  decideAiApprovalQueueItem,
} = require('./aiApprovalQueueContract');

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

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeApprovalQueuePayload = (item) => {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Approval queue item is required.', payload: null };
  }

  const approvalId = String(item.approvalId || item.id || '').trim();
  if (!approvalId) {
    return { valid: false, error: 'Approval queue item approvalId is required.', payload: null };
  }

  if (!item.companyId) {
    return { valid: false, error: 'Approval queue item companyId is required.', payload: null };
  }

  if (!item.toolId) {
    return { valid: false, error: 'Approval queue item toolId is required.', payload: null };
  }

  if (!item.actionProposal || item.actionProposal.type !== 'action_proposal') {
    return { valid: false, error: 'Approval queue item actionProposal is required.', payload: null };
  }

  return {
    valid: true,
    error: null,
    payload: {
      approvalId,
      schemaVersion: item.schemaVersion || 'ai_approval_queue.v1',
      companyId: item.companyId,
      requestedByUserId: item.requestedByUserId || null,
      decidedByUserId: item.decidedByUserId || null,
      status: item.status || 'pending',
      decision: item.decision || null,
      toolId: item.toolId,
      riskLevel: item.riskLevel || null,
      executionMode: item.executionMode || null,
      requiresApproval: item.requiresApproval === true,
      blocked: item.blocked === true,
      requestedBy: item.requestedBy || null,
      approvalReason: item.approvalReason || item.reason || null,
      decisionReason: item.decisionReason || null,
      actionProposal: item.actionProposal,
      metadata: item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
        ? item.metadata
        : {},
      expiresAt: toDateOrNull(item.expiresAt),
      decidedAt: toDateOrNull(item.decidedAt),
      auditRequired: item.auditRequired === true,
    },
  };
};

const persistApprovalQueueItem = async ({ item } = {}) => {
  if (!AIApprovalQueueItem) {
    return {
      success: false,
      persisted: false,
      created: false,
      item: null,
      error: 'AIApprovalQueueItem model is unavailable.',
    };
  }

  const normalized = normalizeApprovalQueuePayload(item);
  if (!normalized.valid) {
    return {
      success: false,
      persisted: false,
      created: false,
      item: null,
      error: normalized.error,
    };
  }

  const [record, created] = await AIApprovalQueueItem.findOrCreate({
    where: { approvalId: normalized.payload.approvalId },
    defaults: normalized.payload,
  });

  return {
    success: true,
    persisted: true,
    created,
    item: serializeApprovalQueueItem(record),
    error: null,
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


const getById = async (approvalId) => {
  if (!approvalId || !AIApprovalQueueItem) {
    return null;
  }

  const record = await AIApprovalQueueItem.findOne({
    where: { approvalId },
  });

  return serializeApprovalQueueItem(record);
};

const markExecuted = async ({
  approvalId,
  companyId,
  execution = {},
} = {}) => {
  if (!approvalId) {
    return {
      success: false,
      item: null,
      error: 'approvalId is required.',
      code: 'AI_APPROVAL_ID_REQUIRED',
    };
  }

  if (!companyId) {
    return {
      success: false,
      item: null,
      error: 'companyId is required.',
      code: 'AI_APPROVAL_COMPANY_REQUIRED',
    };
  }

  if (!AIApprovalQueueItem) {
    return {
      success: false,
      item: null,
      error: 'AIApprovalQueueItem model is unavailable.',
      code: 'AI_APPROVAL_MODEL_UNAVAILABLE',
    };
  }

  const record = await AIApprovalQueueItem.findOne({
    where: { approvalId, companyId },
  });

  if (!record) {
    return {
      success: false,
      item: null,
      error: 'Approval queue item not found.',
      code: 'AI_APPROVAL_NOT_FOUND',
    };
  }

  const current = serializeApprovalQueueItem(record);
  const existingExecution =
    current?.metadata?.execution &&
    typeof current.metadata.execution === 'object' &&
    !Array.isArray(current.metadata.execution)
      ? current.metadata.execution
      : null;

  if (
    current.status === AI_APPROVAL_STATUSES.EXECUTED ||
    existingExecution?.executedAt
  ) {
    return {
      success: false,
      item: current,
      error: 'Approval queue item has already been executed.',
      code: 'AI_APPROVAL_ALREADY_EXECUTED',
    };
  }

  if (
    current.status !== AI_APPROVAL_STATUSES.APPROVED ||
    current.decision !== AI_APPROVAL_DECISIONS.APPROVE
  ) {
    return {
      success: false,
      item: current,
      error: 'Only approved approval queue items can be executed.',
      code: 'AI_APPROVAL_NOT_APPROVED',
    };
  }

  if (current.blocked === true || current.actionProposal?.blocked === true) {
    return {
      success: false,
      item: current,
      error: 'Blocked approval queue items cannot be executed.',
      code: 'AI_APPROVAL_EXECUTION_BLOCKED',
    };
  }

  const metadata =
    record.metadata &&
    typeof record.metadata === 'object' &&
    !Array.isArray(record.metadata)
      ? record.metadata
      : {};

  const executedAt = new Date().toISOString();

  const [updatedCount] = await AIApprovalQueueItem.update(
    {
      status: AI_APPROVAL_STATUSES.EXECUTED,
      metadata: {
        ...metadata,
        execution: {
          ...execution,
          executedAt,
        },
      },
    },
    {
      where: {
        approvalId,
        companyId,
        status: AI_APPROVAL_STATUSES.APPROVED,
      },
    },
  );

  if (updatedCount !== 1) {
    const latest = await AIApprovalQueueItem.findOne({
      where: { approvalId, companyId },
    });

    return {
      success: false,
      item: serializeApprovalQueueItem(latest),
      error: 'Approval queue item execution state changed before completion.',
      code: 'AI_APPROVAL_EXECUTION_CONFLICT',
    };
  }

  await record.reload();

  return {
    success: true,
    item: serializeApprovalQueueItem(record),
    error: null,
    code: null,
  };
};

const decideApprovalQueueItem = async ({
  approvalId,
  companyId,
  decision,
  decidedByUserId,
  decisionReason,
  now = new Date(),
} = {}) => {
  if (!approvalId) {
    return { success: false, item: null, error: 'approvalId is required.' };
  }

  if (!companyId) {
    return { success: false, item: null, error: 'companyId is required.' };
  }

  if (!Object.values(AI_APPROVAL_DECISIONS).includes(decision)) {
    return { success: false, item: null, error: 'Unsupported approval decision.' };
  }

  if (!AIApprovalQueueItem) {
    return { success: false, item: null, error: 'AIApprovalQueueItem model is unavailable.' };
  }

  const record = await AIApprovalQueueItem.findOne({
    where: { approvalId, companyId },
  });

  if (!record) {
    return { success: false, item: null, error: 'Approval queue item not found.' };
  }

  const plain = serializeApprovalQueueItem(record);
  const decisionResult = decideAiApprovalQueueItem({
    item: {
      ...plain,
      actionProposalValid: true,
    },
    decision,
    decidedByUserId,
    decisionReason,
    now,
  });

  if (!decisionResult.success) {
    return {
      success: false,
      item: decisionResult.item || plain,
      error: decisionResult.error,
    };
  }

  await record.update({
    status: decisionResult.item.status,
    decision,
    decisionReason: decisionResult.item.decisionReason || null,
    decidedByUserId: decisionResult.item.decidedByUserId || null,
    decidedAt: toDateOrNull(decisionResult.item.decidedAt) || new Date(),
  });

  return {
    success: true,
    item: serializeApprovalQueueItem(record),
    error: null,
  };
};

module.exports = {
  decideApprovalQueueItem,
  getById,
  listApprovalQueueItems,
  markExecuted,
  normalizeApprovalQueuePayload,
  persistApprovalQueueItem,
  serializeApprovalQueueItem,
};
