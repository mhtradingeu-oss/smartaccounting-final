// OCR Fallback Parser (stub)
const BankTransaction = require('./BankTransaction');

function parseOCRStatement(pdfBuffer) {
  // TODO: Integrate real OCR (e.g. Tesseract)
  // For now, return empty array
  return [];
}

module.exports = { parseOCRStatement };
