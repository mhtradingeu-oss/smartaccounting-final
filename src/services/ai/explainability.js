// Explainability schema and helpers for all AI outputs

/**
 * Explainability object structure for AI suggestions/insights
 * @typedef {Object} Explainability
 * @property {string} why - Plain-language explanation
 * @property {Array<string>} dataPoints - Data fields used
 * @property {string} ruleOrModel - Rule or model reference
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} legalContext - Legal/compliance context
 */

/**
 * Build an explainability object for an AI output
 * @param {Object} params
 * @param {string} params.why
 * @param {Array<string>} params.dataPoints
 * @param {string} params.ruleOrModel
 * @param {number} params.confidence
 * @param {string} params.legalContext
 * @returns {Explainability}
 */
function buildExplainability({ why, dataPoints, ruleOrModel, confidence, legalContext }) {
  return { why, dataPoints, ruleOrModel, confidence, legalContext };
}

module.exports = { buildExplainability };
