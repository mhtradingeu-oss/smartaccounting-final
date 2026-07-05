const {
  TOOL_RISK_LEVELS,
  TOOL_EXECUTION_MODES,
  getAiTool,
  isToolForbidden,
  requiresApproval,
} = require('./aiToolRegistry');

const ACTION_PROPOSAL_TYPE = 'action_proposal';

const ACTION_PROPOSAL_STATUSES = Object.freeze({
  READ_ONLY: 'read_only',
  PROPOSAL_READY: 'proposal_ready',
  APPROVAL_REQUIRED: 'approval_required',
  BLOCKED: 'blocked',
});

const DEFAULT_BLOCKED_ACTIONS = Object.freeze([
  'post',
  'approve',
  'delete',
  'reconcile',
  'submit_tax',
  'pay',
  'direct_external_submission',
]);

const APPROVAL_REQUIRED_TEXT =
  'Human approval is required before any data is changed. The AI may prepare a proposal or draft only through the reviewed accounting workflow.';

const BLOCKED_ACTION_TEXT =
  'This action is blocked for direct AI execution. Use the reviewed accounting workflow with human oversight.';

const READ_ONLY_TEXT =
  'This is a read-only advisory action. No data is changed.';

const getProposalStatus = (tool) => {
  if (!tool) {
    return ACTION_PROPOSAL_STATUSES.BLOCKED;
  }

  if (isToolForbidden(tool.id)) {
    return ACTION_PROPOSAL_STATUSES.BLOCKED;
  }

  if (tool.approvalRequired) {
    return ACTION_PROPOSAL_STATUSES.APPROVAL_REQUIRED;
  }

  if (tool.riskLevel === TOOL_RISK_LEVELS.READ_ONLY && tool.executionMode === TOOL_EXECUTION_MODES.READ) {
    return ACTION_PROPOSAL_STATUSES.READ_ONLY;
  }

  return ACTION_PROPOSAL_STATUSES.PROPOSAL_READY;
};

const normalizeBlockedActions = (tool, blockedActions = []) => {
  const combined = [
    ...(Array.isArray(tool?.blockedActions) ? tool.blockedActions : []),
    ...(Array.isArray(blockedActions) ? blockedActions : []),
  ];

  if (isToolForbidden(tool?.id)) {
    combined.push(...DEFAULT_BLOCKED_ACTIONS);
  }

  return [...new Set(combined.filter(Boolean))];
};

const sanitizePreview = (preview) => {
  if (!preview || typeof preview !== 'object' || Array.isArray(preview)) {
    return {};
  }
  return { ...preview };
};

const buildAiActionProposal = ({
  toolId,
  summary,
  preview = {},
  blockedActions = [],
  evidence = [],
  reason = '',
  requestedBy = 'ai_assistant',
  metadata = {},
} = {}) => {
  const tool = getAiTool(toolId);
  const knownTool = !!tool;
  const status = getProposalStatus(tool);
  const forbidden = !knownTool || isToolForbidden(toolId);

  return {
    type: ACTION_PROPOSAL_TYPE,
    schemaVersion: 'ai_action_proposal.v1',
    toolId: knownTool ? tool.id : toolId || 'unknown_tool',
    toolKnown: knownTool,
    label: tool?.label || 'Unknown AI tool',
    riskLevel: tool?.riskLevel || TOOL_RISK_LEVELS.FORBIDDEN,
    executionMode: tool?.executionMode || TOOL_EXECUTION_MODES.BLOCKED,
    status,
    requiresApproval: knownTool ? requiresApproval(tool.id) : false,
    approvalRequiredText: knownTool && requiresApproval(tool.id) ? APPROVAL_REQUIRED_TEXT : null,
    blocked: forbidden,
    blockedReason: forbidden
      ? tool?.blockedReason || 'Unknown or blocked AI tool. Unknown tools are forbidden by default.'
      : null,
    blockedActionText: forbidden ? BLOCKED_ACTION_TEXT : null,
    readOnlyText: status === ACTION_PROPOSAL_STATUSES.READ_ONLY ? READ_ONLY_TEXT : null,
    allowedRoles: Array.isArray(tool?.allowedRoles) ? [...tool.allowedRoles] : [],
    routeHint: tool?.routeHint || null,
    summary: summary || tool?.description || 'AI action proposal.',
    preview: sanitizePreview(preview),
    blockedActions: normalizeBlockedActions(tool, blockedActions),
    evidence: Array.isArray(evidence) ? evidence : [],
    reason: String(reason || '').trim(),
    requestedBy,
    metadata: sanitizePreview(metadata),
    finalPosting: tool?.finalPosting === true,
    directExternalSubmission: tool?.directExternalSubmission === true,
  };
};

const validateAiActionProposal = (proposal) => {
  const errors = [];

  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, errors: ['Proposal must be an object.'] };
  }

  if (proposal.type !== ACTION_PROPOSAL_TYPE) {
    errors.push('Proposal type must be action_proposal.');
  }

  if (proposal.schemaVersion !== 'ai_action_proposal.v1') {
    errors.push('Proposal schemaVersion must be ai_action_proposal.v1.');
  }

  if (!proposal.toolId) {
    errors.push('Proposal toolId is required.');
  }

  if (!Object.values(TOOL_RISK_LEVELS).includes(proposal.riskLevel)) {
    errors.push('Proposal riskLevel is invalid.');
  }

  if (!Object.values(TOOL_EXECUTION_MODES).includes(proposal.executionMode)) {
    errors.push('Proposal executionMode is invalid.');
  }

  if (!Object.values(ACTION_PROPOSAL_STATUSES).includes(proposal.status)) {
    errors.push('Proposal status is invalid.');
  }

  if (proposal.blocked && proposal.status !== ACTION_PROPOSAL_STATUSES.BLOCKED) {
    errors.push('Blocked proposals must use blocked status.');
  }

  if (
    proposal.status === ACTION_PROPOSAL_STATUSES.APPROVAL_REQUIRED &&
    proposal.requiresApproval !== true
  ) {
    errors.push('Approval-required proposals must set requiresApproval=true.');
  }

  if (
    proposal.riskLevel === TOOL_RISK_LEVELS.FORBIDDEN &&
    proposal.executionMode !== TOOL_EXECUTION_MODES.BLOCKED
  ) {
    errors.push('Forbidden proposals must use blocked execution mode.');
  }

  if (proposal.finalPosting === true && proposal.blocked !== true) {
    errors.push('Final posting proposals must remain blocked in Phase 6F.');
  }

  if (proposal.directExternalSubmission === true && proposal.blocked !== true) {
    errors.push('Direct external submission proposals must remain blocked in Phase 6F.');
  }

  return { valid: errors.length === 0, errors };
};

module.exports = {
  ACTION_PROPOSAL_TYPE,
  ACTION_PROPOSAL_STATUSES,
  APPROVAL_REQUIRED_TEXT,
  BLOCKED_ACTION_TEXT,
  READ_ONLY_TEXT,
  DEFAULT_BLOCKED_ACTIONS,
  buildAiActionProposal,
  validateAiActionProposal,
};
