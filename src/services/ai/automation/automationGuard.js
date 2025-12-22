// automationGuard.js
// Enforces Phase 13 gates: no mutation, no tax, scoped automation, explainability, audit.

// Defensive guard functions for automation engine (read-only, no mutation)
const mutationKeywords = [
  'apply', 'update', 'change', 'delete', 'remove', 'create', 'edit', 'execute', 'trigger', 'write', 'save', 'submit',
];

function assertReadOnlyContext({ method }) {
  if (method && method.toUpperCase() !== 'GET') {
    throw new Error('Only GET/read-only methods are allowed.');
  }
}

function assertNoMutationIntent(text) {
  if (!text) {
    return;
  }
  const lower = text.toLowerCase();
  if (mutationKeywords.some(kw => lower.includes(kw))) {
    throw new Error('Mutation intent detected in prompt. Read-only context required.');
  }
}

function assertSuggestionValid(suggestion) {
  // Use contract validator
  const { validateAutomationSuggestion } = require('./automationContract');
  validateAutomationSuggestion(suggestion);
}

module.exports = {
  assertReadOnlyContext,
  assertNoMutationIntent,
  assertSuggestionValid,
};
