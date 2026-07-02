// Validator for AI Decision contract
const Ajv = require('ajv');
const contract = require('./decisionContract');

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(contract);

module.exports = function validateDecision(body) {
  const valid = validate(body);
  if (!valid) {
    const error = validate.errors[0];
    return {
      valid: false,
      error: error.message,
    };
  }
  return { valid: true };
};
