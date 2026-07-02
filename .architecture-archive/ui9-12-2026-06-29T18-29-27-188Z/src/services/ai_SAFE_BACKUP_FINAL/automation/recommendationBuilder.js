// recommendationBuilder.js
// Builds explainable, read-only recommendations for AI automation.

// Converts AutomationFinding to AutomationSuggestion
const { v4: uuidv4 } = require('uuid');

/**
 * Converts a finding to a suggestion (always requires human approval)
 * @param {AutomationFinding} finding
 * @returns {AutomationSuggestion}
 */
function buildSuggestionFromFinding(finding) {
  return {
    id: finding.id || uuidv4(),
    type: finding.type,
    severity: finding.severity,
    confidence: finding.confidence,
    title: finding.title,
    explanation: finding.explanation,
    evidence: finding.evidence,
    relatedEntities: finding.relatedEntities,
    recommendedNextStep: `Review the ${finding.type} finding and take appropriate action.`,
    requiresHumanApproval: true,
  };
}

module.exports = { buildSuggestionFromFinding };
