// suggestionContract.js
// Validates the AI suggestion contract for Phase 12

/**
 * Throws if suggestion does not match contract
 * @param {Object} suggestion
 */
function validateSuggestionContract(suggestion) {
  if (!suggestion) {
  throw new Error('Suggestion missing');
}
  const requiredFields = ['confidence', 'explanation', 'severity', 'relatedEntity', 'advisory'];
  for (const field of requiredFields) {
    if (!(field in suggestion)) {
      throw new Error(`Suggestion missing required field: ${field}`);
    }
  }
  if (typeof suggestion.confidence !== 'number' || suggestion.confidence < 0 || suggestion.confidence > 1) {
    throw new Error('Invalid confidence value');
  }
  if (typeof suggestion.explanation !== 'string' || !suggestion.explanation.trim()) {
    throw new Error('Invalid explanation');
  }
  if (!['low','medium','high'].includes(suggestion.severity)) {
    throw new Error('Invalid severity');
  }
  if (typeof suggestion.relatedEntity !== 'string' || !suggestion.relatedEntity.trim()) {
    throw new Error('Invalid relatedEntity');
  }
  if (suggestion.advisory !== true) {
    throw new Error('Suggestion must be advisory only');
  }
}

module.exports = { validateSuggestionContract };
