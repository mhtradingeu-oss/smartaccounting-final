// src/ai/aiReadContract.js
// Defines the AI Read Contract for input/output validation

const REQUIRED_INPUT_FIELDS = ['requestId', 'user', 'purpose', 'policyVersion', 'prompt'];

function validateInputContract(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, reason: 'Missing input object' };
  }
  for (const field of REQUIRED_INPUT_FIELDS) {
    if (field === 'user') {
      if (!input.user || !input.user.id || !input.user.companyId) {
        return { ok: false, reason: 'Missing user or user fields' };
      }
    } else if (!input[field]) {
      return { ok: false, reason: ` ${field}` };
    }
  }
  return { ok: true };
}

function shapeOutputContract({
  requestId,
  disclaimer,
  policyVersion,
  modelVersion,
  status,
  data,
  explainability,
}) {
  return {
    requestId,
    disclaimer,
    policyVersion,
    modelVersion,
    readOnly: true,
    status,
    data,
    ...(explainability ? { explainability } : {}),
  };
}

module.exports = {
  validateAIReadInput: validateInputContract,
  shapeAIReadOutput: shapeOutputContract,
};
