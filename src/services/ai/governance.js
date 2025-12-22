// AI governance and EU safety enforcement

/**
 * Enforce AI purpose limitation and GDPR-safe processing
 * @param {Object} aiInput
 * @param {string[]} allowedFields - Only these fields may be processed
 * @returns {Object} Filtered input
 */
function enforcePurposeLimitation(aiInput, allowedFields) {
  const filtered = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(aiInput, key)) {
      filtered[key] = aiInput[key];
    }
  }
  return filtered;
}

/**
 * Add AI disclaimer to all outputs
 * @param {Object} aiOutput
 * @returns {Object} Output with disclaimer
 */
function addAIDisclaimer(aiOutput) {
  return {
    ...aiOutput,
    disclaimer: 'AI suggestions are advisory only. No data is changed without explicit user approval. All actions are logged. GDPR/GoBD enforced.',
  };
}

module.exports = { enforcePurposeLimitation, addAIDisclaimer };
