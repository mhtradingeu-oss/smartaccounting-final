const vatComplianceService = require('./vatComplianceService');

const KEYWORD_CATEGORIES = [
  { category: 'software_services', keywords: ['hosting', 'saas', 'subscription', 'cloud'] },
  { category: 'office_supplies', keywords: ['office', 'stationery', 'printer', 'paper'] },
  { category: 'travel', keywords: ['hotel', 'bahn', 'flight', 'taxi', 'uber'] },
  { category: 'utilities', keywords: ['electricity', 'gas', 'internet', 'telekom'] },
  { category: 'bank_fees', keywords: ['gebuehr', 'fee', 'konto', 'bank'] },
];

const normalizeText = (value) => (value || '').toString().toLowerCase();

const classifyDocumentType = (text = '') => {
  const normalized = normalizeText(text);
  if (normalized.match(/rechnung|invoice/)) {
    return 'invoice';
  }
  if (normalized.match(/kontoauszug|bank statement|camt|mt940/)) {
    return 'bank_statement';
  }
  if (normalized.match(/quittung|receipt/)) {
    return 'receipt';
  }
  if (normalized.match(/steuer|tax/)) {
    return 'tax_document';
  }
  return 'generic';
};

const deriveCategory = ({ text, vendor } = {}) => {
  const haystack = `${normalizeText(text)} ${normalizeText(vendor)}`;
  for (const rule of KEYWORD_CATEGORIES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return { category: rule.category, confidence: 0.6 };
    }
  }
  return { category: 'uncategorized', confidence: 0.2 };
};

const evaluateInvoiceCompliance = (data = {}) => {
  const errors = [];
  const warnings = [];

  if (!data.invoiceNumber) {
    errors.push('Missing invoice number (UStG §14).');
  }
  if (!data.date) {
    errors.push('Missing invoice date (UStG §14).');
  }
  if (!data.totalAmount && !data.amount && !data.grossAmount) {
    errors.push('Missing total amount.');
  }
  if (!data.vendor) {
    warnings.push('Vendor name not detected.');
  }

  if (data.netAmount !== null && data.vatAmount !== null && data.totalAmount !== null) {
    const expectedGross = Number(data.netAmount) + Number(data.vatAmount);
    if (Math.abs(expectedGross - Number(data.totalAmount)) > 0.02) {
      errors.push('Net + VAT does not equal total amount.');
    }
  } else {
    warnings.push('Unable to verify net/VAT totals.');
  }

  if (data.netAmount !== null && data.vatAmount !== null && data.totalAmount !== null) {
    const vatRate = Number(data.vatRate);
    if (Number.isFinite(vatRate)) {
      const vatCheck = vatComplianceService.validateTransaction({
        net: data.netAmount,
        vat: data.vatAmount,
        gross: data.totalAmount,
        vatRate,
        currency: data.currency || 'EUR',
      });
      if (!vatCheck.valid) {
        errors.push(...vatCheck.errors.map((err) => err.message));
      }
    } else {
      warnings.push('VAT rate not detected; VAT compliance not fully verified.');
    }
  }

  return { errors, warnings };
};

const evaluateReceiptCompliance = (data = {}) => {
  const errors = [];
  const warnings = [];
  if (!data.date) {
    errors.push('Missing receipt date.');
  }
  if (!data.amount && !data.totalAmount) {
    errors.push('Missing receipt total amount.');
  }
  if (!data.vendor) {
    warnings.push('Vendor name not detected.');
  }
  return { errors, warnings };
};

const evaluateBankStatementCompliance = (data = {}) => {
  const errors = [];
  const warnings = [];
  if (!data.accountNumber) {
    errors.push('Missing account number.');
  }
  if (!data.period) {
    warnings.push('Statement period not detected.');
  }
  if (data.openingBalance === null || data.closingBalance === null) {
    warnings.push('Opening/closing balances not detected.');
  }
  return { errors, warnings };
};

const evaluateCompliance = (documentType, extractedData = {}) => {
  let errors = [];
  let warnings = [];
  switch (documentType) {
    case 'invoice':
      ({ errors, warnings } = evaluateInvoiceCompliance(extractedData));
      break;
    case 'receipt':
      ({ errors, warnings } = evaluateReceiptCompliance(extractedData));
      break;
    case 'bank_statement':
      ({ errors, warnings } = evaluateBankStatementCompliance(extractedData));
      break;
    default:
      warnings.push('Document type could not be validated.');
  }

  const hasData = extractedData && Object.keys(extractedData).length > 0;
  const status = !hasData
    ? 'draft'
    : errors.length > 0
    ? 'rejected'
    : warnings.length > 0
    ? 'needs_review'
    : 'accepted';
  const recommendations =
    status === 'rejected'
      ? ['Resolve required fields before posting.']
      : status === 'draft'
      ? ['Upload a clearer document or fill missing details manually.']
      : status === 'needs_review'
      ? ['Review extracted values and confirm before posting.']
      : ['Ready for review and posting.'];

  return { status, errors, warnings, recommendations };
};

const analyzeDocument = ({ text, extractedData = {}, documentType }) => {
  const normalizedType = documentType || classifyDocumentType(text);
  const category = deriveCategory({ text, vendor: extractedData.vendor });
  const compliance = evaluateCompliance(normalizedType, extractedData);

  return {
    documentType: normalizedType,
    category,
    compliance,
  };
};

module.exports = {
  analyzeDocument,
  classifyDocumentType,
};
