const VatComplianceService = require('../services/vatComplianceService');

function normalizeCurrency(value) {
  if (!value) {
    return 'EUR';
  }
  return String(value).trim().toUpperCase();
}

function enforceCurrencyIsEur(value, fieldName = 'currency') {
  const normalized = normalizeCurrency(value);
  if (normalized !== 'EUR') {
    const err = new Error(`${fieldName} must be EUR for VAT compliance.`);
    err.status = 400;
    throw err;
  }
  return 'EUR';
}

function ensureVatTotalsMatch({ net, vat, gross, vatRate, currency = 'EUR' }) {
  const { valid, errors } = VatComplianceService.validateTransaction({
    net,
    vat,
    gross,
    vatRate,
    currency,
  });
  if (valid) {
    return;
  }
  const message = errors.map((err) => `${err.code}: ${err.message}`).join(' ');
  const error = new Error(message);
  error.status = 400;
  error.codes = errors.map((err) => err.code);
  throw error;
}

function assertProvidedMatches(provided, expected, label) {
  if (provided === undefined || provided === null) {
    return;
  }
  if (Number(provided) !== Number(expected)) {
    const err = new Error(`${label} mismatch: expected ${expected}, got ${provided}`);
    err.status = 400;
    throw err;
  }
}

module.exports = {
  enforceCurrencyIsEur,
  ensureVatTotalsMatch,
  assertProvidedMatches,
};
