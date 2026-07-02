// Approval state model and API contract for human-in-the-loop

/**
 * Approval states for AI suggestions
 * - pending: Awaiting user action
 * - accepted: User approved
 * - rejected: User rejected (with reason)
 * - overridden: User manually changed
 */
const ApprovalState = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  OVERRIDDEN: 'overridden',
});

/**
 * API contract for accepting/rejecting AI suggestions
 * @param {Object} params
 * @param {string} params.suggestionId
 * @param {string} params.userId
 * @param {'accepted'|'rejected'|'overridden'} params.action
 * @param {string} [params.reason] - Required for rejection/override
 * @returns {Object} Result
 */
function handleApprovalAction({ suggestionId, userId, action, reason }) {
  if ((action === ApprovalState.REJECTED || action === ApprovalState.OVERRIDDEN) && !reason) {
    throw new Error('Reason required for rejection/override');
  }
  // Log action (to be implemented in controller)
  return {
    suggestionId,
    userId,
    action,
    reason: reason || null,
    timestamp: new Date(),
  };
}

module.exports = { ApprovalState, handleApprovalAction };
