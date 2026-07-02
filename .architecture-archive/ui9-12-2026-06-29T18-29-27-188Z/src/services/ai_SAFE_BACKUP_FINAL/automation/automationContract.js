/**
 * @typedef {Object} EvidenceItem
 * @property {string} id - Unique evidence identifier
 * @property {string} type - Type of evidence (e.g., 'invoice', 'transaction')
 * @property {string} summary - Short, non-PII summary of evidence
 */

/**
 * @typedef {Object} RelatedEntity
 * @property {string} entityType - e.g., 'Invoice', 'Transaction'
 * @property {string|number} entityId - ID of the related entity
 */

/**
 * @typedef {Object} AutomationFinding
 * @property {string} id - Unique finding identifier
 * @property {string} type - Detector type (e.g., 'duplicateInvoice')
 * @property {string} severity - 'low' | 'medium' | 'high'
 * @property {number} confidence - 0..1
 * @property {string} title - Short finding title
 * @property {string} explanation - Human-readable, explainable reason
 * @property {EvidenceItem[]} evidence - Array of evidence items
 * @property {RelatedEntity[]} relatedEntities - Array of related entities
 */

/**
 * @typedef {Object} AutomationSuggestion
 * @property {string} id - Unique suggestion identifier
 * @property {string} type - Suggestion type (e.g., 'duplicateInvoice')
 * @property {string} severity - 'low' | 'medium' | 'high'
 * @property {number} confidence - 0..1
 * @property {string} title - Short suggestion title
 * @property {string} explanation - Human-readable, explainable reason
 * @property {EvidenceItem[]} evidence - Array of evidence items
 * @property {RelatedEntity[]} relatedEntities - Array of related entities
 * @property {string} recommendedNextStep - Advisory next step (string only)
 * @property {boolean} requiresHumanApproval - Always true
 */

// Enforce required fields for AutomationSuggestion
function validateAutomationSuggestion(suggestion) {
  const requiredFields = [
    'id', 'type', 'severity', 'confidence', 'title', 'explanation',
    'evidence', 'relatedEntities', 'recommendedNextStep', 'requiresHumanApproval',
  ];
  for (const field of requiredFields) {
    if (suggestion[field] === undefined) {
      throw new Error(` ${field}`);
    }
  }
  if (suggestion.requiresHumanApproval !== true) {
    throw new Error('requiresHumanApproval must be true');
  }
}

module.exports = {
  validateAutomationSuggestion,
  // Typedefs are for documentation/IDE only
};
