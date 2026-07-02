const { validateSuggestionContract } = require('./suggestionContract');
const { logSuggestionEvent } = require('./aiAuditLogger');
const { detectMutationIntent } = require('./mutationIntent');

async function getSuggestion(params) {
  // eslint-disable-next-line no-unused-vars -- reserved for AI explainability / audit
  const { userId, companyId, prompt, context, requestId } = params;

  if (!companyId) {
    throw new Error('Company context required');
  }

  const intent = detectMutationIntent(prompt);
  if (intent.detected) {
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
    requestId,
    prompt,
    suggestion,
    createdAt: new Date(),
  });

  return suggestion;
}

module.exports = { getSuggestion };
