const { validateSuggestionContract } = require('./suggestionContract');
const { logSuggestionEvent } = require('./aiAuditLogger');
const { detectMutationIntent } = require('./mutationIntent');

async function getSuggestion(params) {
  // eslint-disable-next-line no-unused-vars -- reserved for AI explainability / audit
  const { userId, companyId, prompt, context, user } = params;

  // Strict cross-company guard
  const effectiveUserCompanyId = user && user.companyId ? user.companyId : undefined;
  if (!companyId || (effectiveUserCompanyId && companyId !== effectiveUserCompanyId)) {
    await logSuggestionEvent({
      eventType: 'AI_SUGGESTION_REJECTED',
      userId,
      companyId,
      prompt,
      reason: 'Cross-company AI access denied',
      createdAt: new Date(),
    });
    throw new Error('Cross-company AI access denied');
  }

  const intent = detectMutationIntent(prompt);
  if (intent.detected) {
    await logSuggestionEvent({
      eventType: 'AI_SUGGESTION_REJECTED',
      userId,
      companyId,
      prompt,
      reason: intent.reason || 'Mutation intent detected',
      createdAt: new Date(),
    });
    throw new Error('Mutation intent detected. Suggestions must be read-only.');
  }

  // Generate suggestion (stub: replace with actual AI logic)
  const suggestion = {
    confidence: 0.85,
    explanation: 'Based on invoice history, consider reviewing overdue invoices.',
    severity: 'medium',
    relatedEntity: 'Invoice',
    advisory: true,
    // ...other safe fields
  };

  // Validate contract
  validateSuggestionContract(suggestion);

  // Log suggestion event
  await logSuggestionEvent({
    eventType: 'AI_SUGGESTION_REQUESTED',
    userId,
    companyId,
    prompt,
    suggestion,
    createdAt: new Date(),
  });

  return suggestion;
}

module.exports = { getSuggestion };
