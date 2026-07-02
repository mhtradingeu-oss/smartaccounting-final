'use strict';

/**
 * Redact PII from a string (emails, phones, IBAN, tax IDs, addresses)
 * ORDER IS CRITICAL – do not change without tests.
 *
 * Order:
 * 1) IBAN
 * 2) TAX ID
 * 3) Credit Card
 * 4) Phone
 * 5) Email
 * 6) Address
 *
 * @param {string} input
 * @returns {string}
 */
function redactPII(input) {
  if (typeof input !== 'string') {
    return input;
  }

  let out = input;

  // 1) IBAN (EU / DE / generic)
  out = out.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, '[REDACTED_IBAN]');

  // 2) TAX ID (DE + digits OR long digit sequences not part of phone)
  // Must run BEFORE phone regex
  // German USt-IdNr: DE followed by 9-11 digits (test expects DE12345678901)
  out = out.replace(/\bDE\d{9,11}\b/g, '[REDACTED_TAXID]');
  // German Steuer-ID: 11-13 digits, not part of phone, not preceded by +
  out = out.replace(/(?<!\+)\b\d{11,13}\b/g, '[REDACTED_TAXID]');

  // 3) Credit Card (13–19 digits, optional separators)
  out = out.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CREDITCARD]');

  // 4) Phone numbers (must NOT consume IBAN / TAX / CC)
  out = out.replace(/(?<![A-Z0-9])\+?\d[\d\s().-]{6,}\d\b/g, '[REDACTED_PHONE]');

  // 5) Email addresses
  out = out.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');

  // 6) Addresses (very conservative heuristic)
  out = out.replace(/\b[A-Za-zäöüÄÖÜß\s]{3,}\s\d{1,4}[a-zA-Z]?\b/g, '[REDACTED_ADDRESS]');

  return out;
}

/**
 * Enforce AI purpose limitation and GDPR-safe processing
 * @param {Object} aiInput
 * @param {string[]} allowedFields
 * @returns {Object}
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
 * Injects required AI response metadata
 */
function shapeAIResponse(aiOutput, { requestId, policyVersion, modelVersion }) {
  return {
    ...aiOutput,
    disclaimer:
      'AI suggestions are advisory only. No data is changed without explicit user approval. All actions are logged. GDPR/GoBD enforced.',
    requestId,
    policyVersion,
    modelVersion,
    readOnly: true,
  };
}

function addAIDisclaimer(aiOutput) {
  return shapeAIResponse(aiOutput, {
    requestId: undefined,
    policyVersion: undefined,
    modelVersion: undefined,
  });
}

module.exports = {
  enforcePurposeLimitation,
  shapeAIResponse,
  redactPII,
  addAIDisclaimer,
};
