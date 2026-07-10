const crypto = require('crypto');
const {
  ACTION_PROPOSAL_STATUSES,
  buildAiActionProposal,
  validateAiActionProposal,
} = require('./aiActionProposalContract');

const AI_APPROVAL_QUEUE_SCHEMA_VERSION = 'ai_approval_queue.v1';

const AI_APPROVAL_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  EXECUTING: 'executing',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  EXECUTION_BLOCKED: 'execution_blocked',
  EXECUTED: 'executed',
});

const AI_APPROVAL_DECISIONS = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
  CANCEL: 'cancel',
  EXPIRE: 'expire',
  BLOCK_EXECUTION: 'block_execution',
});

const DEFAULT_APPROVAL_TTL_MINUTES = 60;

const TERMINAL_APPROVAL_STATUSES = Object.freeze([
  AI_APPROVAL_STATUSES.APPROVED,
  AI_APPROVAL_STATUSES.REJECTED,
  AI_APPROVAL_STATUSES.EXPIRED,
  AI_APPROVAL_STATUSES.CANCELLED,
  AI_APPROVAL_STATUSES.EXECUTION_BLOCKED,
  AI_APPROVAL_STATUSES.EXECUTED,
]);

const makeApprovalId = () => `aiap_${crypto.randomUUID()}`;

const toDate = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIso = (value) => {
  const date = toDate(value);
  return date ? date.toISOString() : null;
};

const addMinutes = (date, minutes) => {
  const base = toDate(date) || new Date();
  return new Date(base.getTime() + Number(minutes || 0) * 60 * 1000);
};

const isTerminalApprovalStatus = (status) => TERMINAL_APPROVAL_STATUSES.includes(status);

const normalizeActionProposal = (actionProposalOrInput) => {
  if (actionProposalOrInput?.type === 'action_proposal') {
    return actionProposalOrInput;
  }
  return buildAiActionProposal(actionProposalOrInput || {});
};

const buildAiApprovalQueueItem = ({
  actionProposal,
  toolId,
  summary,
  preview,
  evidence,
  reason,
  requestedBy = 'ai_assistant',
  requestedByUserId = null,
  companyId,
  createdAt = new Date(),
  expiresAt,
  ttlMinutes = DEFAULT_APPROVAL_TTL_MINUTES,
  metadata = {},
} = {}) => {
  const proposal = normalizeActionProposal(
    actionProposal || {
      toolId,
      summary,
      preview,
      evidence,
      reason,
      requestedBy,
      metadata,
    },
  );

  const validation = validateAiActionProposal(proposal);
  const createdAtIso = toIso(createdAt) || new Date().toISOString();
  const expiresAtIso = toIso(expiresAt) || addMinutes(createdAtIso, ttlMinutes).toISOString();
  const blocked = proposal.blocked === true || proposal.status === ACTION_PROPOSAL_STATUSES.BLOCKED;

  return {
    id: makeApprovalId(),
    schemaVersion: AI_APPROVAL_QUEUE_SCHEMA_VERSION,
    status: blocked ? AI_APPROVAL_STATUSES.EXECUTION_BLOCKED : AI_APPROVAL_STATUSES.PENDING,
    actionProposal: proposal,
    actionProposalValid: validation.valid,
    validationErrors: validation.errors,
    toolId: proposal.toolId,
    riskLevel: proposal.riskLevel,
    executionMode: proposal.executionMode,
    requiresApproval: proposal.requiresApproval,
    blocked,
    blockedReason: proposal.blockedReason,
    requestedBy,
    requestedByUserId,
    companyId: companyId || null,
    approvalReason: String(reason || proposal.reason || '').trim(),
    decisionReason: null,
    decidedByUserId: null,
    createdAt: createdAtIso,
    expiresAt: expiresAtIso,
    decidedAt: null,
    auditRequired: true,
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {},
  };
};

const isApprovalExpired = (item, now = new Date()) => {
  const expiresAt = toDate(item?.expiresAt);
  const nowDate = toDate(now) || new Date();
  return !!expiresAt && expiresAt.getTime() <= nowDate.getTime();
};

const canDecideApprovalQueueItem = (item, now = new Date()) => {
  if (!item || typeof item !== 'object') {
    return { allowed: false, reason: 'Approval queue item is required.' };
  }

  if (isTerminalApprovalStatus(item.status)) {
    return { allowed: false, reason: `Approval queue item is already ${item.status}.` };
  }

  if (item.status !== AI_APPROVAL_STATUSES.PENDING) {
    return { allowed: false, reason: 'Only pending approval queue items can be decided.' };
  }

  if (isApprovalExpired(item, now)) {
    return { allowed: false, reason: 'Approval queue item is expired.' };
  }

  if (item.actionProposalValid !== true) {
    return { allowed: false, reason: 'Action proposal is invalid.' };
  }

  if (item.blocked === true) {
    return { allowed: false, reason: 'Blocked action proposals cannot be approved.' };
  }

  if (item.requiresApproval !== true) {
    return { allowed: false, reason: 'Approval is not required for this proposal.' };
  }

  return { allowed: true, reason: null };
};

const decideAiApprovalQueueItem = ({
  item,
  decision,
  decidedByUserId,
  decisionReason,
  decidedAt = new Date(),
  now = new Date(),
} = {}) => {
  const base = item && typeof item === 'object' ? { ...item } : null;

  if (!base) {
    return {
      success: false,
      item: null,
      error: 'Approval queue item is required.',
    };
  }

  if (decision === AI_APPROVAL_DECISIONS.EXPIRE || isApprovalExpired(base, now)) {
    return {
      success: true,
      item: {
        ...base,
        status: AI_APPROVAL_STATUSES.EXPIRED,
        decisionReason: decisionReason || 'Approval expired before decision.',
        decidedByUserId: decidedByUserId || null,
        decidedAt: toIso(decidedAt) || new Date().toISOString(),
      },
      error: null,
    };
  }

  if (decision === AI_APPROVAL_DECISIONS.CANCEL) {
    return {
      success: true,
      item: {
        ...base,
        status: AI_APPROVAL_STATUSES.CANCELLED,
        decisionReason: decisionReason || 'Approval request cancelled.',
        decidedByUserId: decidedByUserId || null,
        decidedAt: toIso(decidedAt) || new Date().toISOString(),
      },
      error: null,
    };
  }

  if (decision === AI_APPROVAL_DECISIONS.BLOCK_EXECUTION) {
    return {
      success: true,
      item: {
        ...base,
        status: AI_APPROVAL_STATUSES.EXECUTION_BLOCKED,
        blocked: true,
        decisionReason: decisionReason || 'Execution blocked by approval guard.',
        decidedByUserId: decidedByUserId || null,
        decidedAt: toIso(decidedAt) || new Date().toISOString(),
      },
      error: null,
    };
  }

  const allowed = canDecideApprovalQueueItem(base, now);
  if (!allowed.allowed) {
    return {
      success: false,
      item: base,
      error: allowed.reason,
    };
  }

  if (decision === AI_APPROVAL_DECISIONS.APPROVE) {
    return {
      success: true,
      item: {
        ...base,
        status: AI_APPROVAL_STATUSES.APPROVED,
        decisionReason: String(decisionReason || '').trim(),
        decidedByUserId: decidedByUserId || null,
        decidedAt: toIso(decidedAt) || new Date().toISOString(),
      },
      error: null,
    };
  }

  if (decision === AI_APPROVAL_DECISIONS.REJECT) {
    const reason = String(decisionReason || '').trim();
    if (!reason) {
      return {
        success: false,
        item: base,
        error: 'Rejection requires a decision reason.',
      };
    }

    return {
      success: true,
      item: {
        ...base,
        status: AI_APPROVAL_STATUSES.REJECTED,
        decisionReason: reason,
        decidedByUserId: decidedByUserId || null,
        decidedAt: toIso(decidedAt) || new Date().toISOString(),
      },
      error: null,
    };
  }

  return {
    success: false,
    item: base,
    error: 'Unsupported approval decision.',
  };
};

const validateAiApprovalQueueItem = (item) => {
  const errors = [];

  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['Approval queue item must be an object.'] };
  }

  if (item.schemaVersion !== AI_APPROVAL_QUEUE_SCHEMA_VERSION) {
    errors.push(`Approval queue schemaVersion must be ${AI_APPROVAL_QUEUE_SCHEMA_VERSION}.`);
  }

  if (!item.id) {
    errors.push('Approval queue item id is required.');
  }

  if (!Object.values(AI_APPROVAL_STATUSES).includes(item.status)) {
    errors.push('Approval queue status is invalid.');
  }

  if (!item.toolId) {
    errors.push('Approval queue toolId is required.');
  }

  if (!item.actionProposal || item.actionProposal.type !== 'action_proposal') {
    errors.push('Approval queue actionProposal is required.');
  }

  if (item.auditRequired !== true) {
    errors.push('Approval queue item must require audit.');
  }

  if (item.status === AI_APPROVAL_STATUSES.PENDING && item.blocked === true) {
    errors.push('Blocked approval queue items cannot remain pending.');
  }

  if (
    item.status === AI_APPROVAL_STATUSES.APPROVED &&
    (item.blocked === true || item.actionProposal?.blocked === true)
  ) {
    errors.push('Blocked proposals cannot be approved.');
  }

  if (item.status === AI_APPROVAL_STATUSES.APPROVED && !item.decidedByUserId) {
    errors.push('Approved approval queue items require decidedByUserId.');
  }

  if (item.status === AI_APPROVAL_STATUSES.REJECTED && !item.decisionReason) {
    errors.push('Rejected approval queue items require decisionReason.');
  }

  if (!toDate(item.createdAt)) {
    errors.push('Approval queue createdAt must be a valid date.');
  }

  if (!toDate(item.expiresAt)) {
    errors.push('Approval queue expiresAt must be a valid date.');
  }

  return { valid: errors.length === 0, errors };
};

module.exports = {
  AI_APPROVAL_QUEUE_SCHEMA_VERSION,
  AI_APPROVAL_STATUSES,
  AI_APPROVAL_DECISIONS,
  DEFAULT_APPROVAL_TTL_MINUTES,
  TERMINAL_APPROVAL_STATUSES,
  buildAiApprovalQueueItem,
  validateAiApprovalQueueItem,
  canDecideApprovalQueueItem,
  decideAiApprovalQueueItem,
  isApprovalExpired,
  isTerminalApprovalStatus,
};
