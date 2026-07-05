const { getAiTool, isToolForbidden, requiresApproval } = require('./aiToolRegistry');
const {
  ACTION_PROPOSAL_STATUSES,
  buildAiActionProposal,
  validateAiActionProposal,
} = require('./aiActionProposalContract');
const {
  AI_APPROVAL_STATUSES,
  buildAiApprovalQueueItem,
  validateAiApprovalQueueItem,
} = require('./aiApprovalQueueContract');

const AI_PROPOSAL_SERVICE_VERSION = 'ai_proposal_service.v1';

const AI_PROPOSAL_SERVICE_RESULT_TYPES = Object.freeze({
  PROPOSAL_ONLY: 'proposal_only',
  APPROVAL_REQUEST: 'approval_request',
  BLOCKED_PROPOSAL: 'blocked_proposal',
});

const createAiProposal = ({
  toolId,
  summary,
  preview = {},
  evidence = [],
  reason = '',
  requestedBy = 'ai_assistant',
  metadata = {},
  blockedActions = [],
} = {}) => {
  const tool = getAiTool(toolId);
  const proposal = buildAiActionProposal({
    toolId,
    summary,
    preview,
    evidence,
    reason,
    requestedBy,
    metadata,
    blockedActions,
  });
  const validation = validateAiActionProposal(proposal);

  return {
    serviceVersion: AI_PROPOSAL_SERVICE_VERSION,
    success: validation.valid,
    resultType: proposal.blocked
      ? AI_PROPOSAL_SERVICE_RESULT_TYPES.BLOCKED_PROPOSAL
      : AI_PROPOSAL_SERVICE_RESULT_TYPES.PROPOSAL_ONLY,
    toolKnown: !!tool,
    tool,
    proposal,
    validation,
    approvalQueueItem: null,
    approvalQueueValidation: null,
    error: validation.valid ? null : validation.errors.join('; '),
  };
};

const createAiApprovalRequest = ({
  toolId,
  actionProposal,
  summary,
  preview = {},
  evidence = [],
  reason = '',
  requestedBy = 'ai_assistant',
  requestedByUserId = null,
  companyId,
  createdAt,
  expiresAt,
  ttlMinutes,
  metadata = {},
  blockedActions = [],
} = {}) => {
  const proposal = actionProposal || buildAiActionProposal({
    toolId,
    summary,
    preview,
    evidence,
    reason,
    requestedBy,
    metadata,
    blockedActions,
  });

  const proposalValidation = validateAiActionProposal(proposal);
  if (!proposalValidation.valid) {
    return {
      serviceVersion: AI_PROPOSAL_SERVICE_VERSION,
      success: false,
      resultType: AI_PROPOSAL_SERVICE_RESULT_TYPES.PROPOSAL_ONLY,
      proposal,
      validation: proposalValidation,
      approvalQueueItem: null,
      approvalQueueValidation: null,
      error: proposalValidation.errors.join('; '),
    };
  }

  if (!proposal.blocked && proposal.requiresApproval !== true) {
    return {
      serviceVersion: AI_PROPOSAL_SERVICE_VERSION,
      success: false,
      resultType: AI_PROPOSAL_SERVICE_RESULT_TYPES.PROPOSAL_ONLY,
      proposal,
      validation: proposalValidation,
      approvalQueueItem: null,
      approvalQueueValidation: null,
      error: 'Approval request can only be created for approval-required or blocked proposals.',
    };
  }

  const approvalQueueItem = buildAiApprovalQueueItem({
    actionProposal: proposal,
    requestedBy,
    requestedByUserId,
    companyId,
    createdAt,
    expiresAt,
    ttlMinutes,
    metadata,
    reason,
  });
  const approvalQueueValidation = validateAiApprovalQueueItem(approvalQueueItem);

  return {
    serviceVersion: AI_PROPOSAL_SERVICE_VERSION,
    success: approvalQueueValidation.valid,
    resultType: proposal.blocked
      ? AI_PROPOSAL_SERVICE_RESULT_TYPES.BLOCKED_PROPOSAL
      : AI_PROPOSAL_SERVICE_RESULT_TYPES.APPROVAL_REQUEST,
    proposal,
    validation: proposalValidation,
    approvalQueueItem,
    approvalQueueValidation,
    error: approvalQueueValidation.valid ? null : approvalQueueValidation.errors.join('; '),
  };
};

const createAiProposalBundle = ({
  toolId,
  summary,
  preview = {},
  evidence = [],
  reason = '',
  requestedBy = 'ai_assistant',
  requestedByUserId = null,
  companyId,
  createdAt,
  expiresAt,
  ttlMinutes,
  metadata = {},
  blockedActions = [],
} = {}) => {
  const proposalResult = createAiProposal({
    toolId,
    summary,
    preview,
    evidence,
    reason,
    requestedBy,
    metadata,
    blockedActions,
  });

  if (!proposalResult.success) {
    return proposalResult;
  }

  const proposal = proposalResult.proposal;
  const needsQueue =
    proposal.blocked === true ||
    proposal.status === ACTION_PROPOSAL_STATUSES.BLOCKED ||
    proposal.requiresApproval === true;

  if (!needsQueue) {
    return proposalResult;
  }

  return createAiApprovalRequest({
    actionProposal: proposal,
    requestedBy,
    requestedByUserId,
    companyId,
    createdAt,
    expiresAt,
    ttlMinutes,
    metadata,
    reason,
  });
};

const summarizeAiProposalBundle = (bundle) => {
  if (!bundle || typeof bundle !== 'object') {
    return {
      serviceVersion: AI_PROPOSAL_SERVICE_VERSION,
      success: false,
      resultType: null,
      message: 'AI proposal bundle is required.',
    };
  }

  const proposal = bundle.proposal || {};
  const queueItem = bundle.approvalQueueItem || null;

  return {
    serviceVersion: AI_PROPOSAL_SERVICE_VERSION,
    success: bundle.success === true,
    resultType: bundle.resultType || null,
    toolId: proposal.toolId || null,
    riskLevel: proposal.riskLevel || null,
    executionMode: proposal.executionMode || null,
    proposalStatus: proposal.status || null,
    requiresApproval: proposal.requiresApproval === true,
    blocked: proposal.blocked === true,
    approvalStatus: queueItem?.status || null,
    approvalId: queueItem?.id || null,
    message:
      proposal.blocked === true
        ? proposal.blockedReason || 'AI proposal is blocked.'
        : proposal.summary || 'AI proposal created.',
  };
};

const isToolEligibleForProposalService = (toolId) => {
  const tool = getAiTool(toolId);
  if (!tool) {
    return {
      eligible: false,
      reason: 'Unknown tools are forbidden by default.',
    };
  }

  if (isToolForbidden(toolId)) {
    return {
      eligible: true,
      reason: 'Tool is known but blocked; proposal service may only create a blocked proposal record.',
    };
  }

  return {
    eligible: true,
    reason: requiresApproval(toolId)
      ? 'Tool is eligible and requires approval.'
      : 'Tool is eligible for proposal-only output.',
  };
};

module.exports = {
  AI_PROPOSAL_SERVICE_VERSION,
  AI_PROPOSAL_SERVICE_RESULT_TYPES,
  createAiProposal,
  createAiApprovalRequest,
  createAiProposalBundle,
  summarizeAiProposalBundle,
  isToolEligibleForProposalService,
  AI_APPROVAL_STATUSES,
};
