const crypto = require('crypto');
const stableStringify = require('json-stable-stringify');

const SUPPORTED_ACTIONS = new Set([
  'create_expense_draft',
  'create_invoice_draft',
  'bank_statement_dry_run',
  'attach_to_bank_transaction',
  'needs_correction',
  'ask_missing_data',
  'unsupported_document',
]);

const normalizeText = (value) => String(value || '').toLowerCase();

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const detectCurrency = (text = '', extracted = {}) => {
  if (extracted.currency) {
    return String(extracted.currency).toUpperCase();
  }
  const normalized = normalizeText(text);
  if (normalized.includes('usd') || normalized.includes('$')) {
    return 'USD';
  }
  if (normalized.includes('gbp') || normalized.includes('£')) {
    return 'GBP';
  }
  return 'EUR';
};

const normalizeVatRate = (value) => {
  const number = toNumber(value);
  if (number === null) {
    return null;
  }
  return number > 1 ? +(number / 100).toFixed(4) : +number.toFixed(4);
};

const buildReviewState = () => ({
  status: 'needs_review',
  reviewRequired: true,
  reviewedByUserId: null,
  reviewedAt: null,
  hasUserCorrections: false,
  criticalFieldsReviewed: false,
});

const clonePlainObject = (value) => JSON.parse(JSON.stringify(value || {}));

const buildEditablePayload = (aiExtractedValues = {}) => ({
  aiExtractedValues: clonePlainObject(aiExtractedValues),
  reviewedValues: null,
  fieldChanges: [],
});

const buildDraftEligibility = ({
  eligible = false,
  reason = 'Review extracted fields and re-check document before draft creation.',
} = {}) => ({
  eligible,
  reason,
  requiredState: {
    reviewStatus: 'rechecked',
    criticalFieldsReviewed: true,
  },
});

const buildReviewGate = ({ aiExtractedValues = {} } = {}) => {
  const reviewState = buildReviewState();
  const editablePayload = buildEditablePayload(aiExtractedValues);
  const draftEligibility = buildDraftEligibility();
  return {
    reviewState,
    editablePayload,
    draftEligibility,
    lifecycle: {
      schemaVersion: 'document_lifecycle_decision.v1',
      reviewState,
      editablePayload,
      draftEligibility,
    },
  };
};

const buildDecisionFingerprint = (decision = {}) =>
  crypto.createHash('sha256').update(stableStringify(decision) || '{}').digest('hex');

const mapReviewedDocumentType = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (['supplier_invoice', 'customer_invoice', 'incoming_supplier_invoice'].includes(normalized)) {
    return 'invoice';
  }
  if (['receipt', 'bank_statement', 'tax_document', 'invoice'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'credit_note') {
    return 'invoice';
  }
  return normalized || 'auto';
};

const mapReviewedValuesToExtractedData = (reviewedValues = {}) => {
  const documentType = mapReviewedDocumentType(reviewedValues.documentType);
  return {
    ...reviewedValues,
    type: documentType === 'auto' ? reviewedValues.type : documentType,
    vendor: reviewedValues.vendorName ?? reviewedValues.vendor,
    vendorName: reviewedValues.vendorName ?? reviewedValues.vendor,
    clientName: reviewedValues.customerName ?? reviewedValues.clientName,
    customerName: reviewedValues.customerName ?? reviewedValues.clientName,
    invoiceNumber: reviewedValues.documentNumber ?? reviewedValues.invoiceNumber,
    documentNumber: reviewedValues.documentNumber ?? reviewedValues.invoiceNumber,
    date: reviewedValues.documentDate ?? reviewedValues.date,
    invoiceDate: reviewedValues.documentDate ?? reviewedValues.invoiceDate,
    expenseDate: reviewedValues.documentDate ?? reviewedValues.expenseDate,
    totalAmount: reviewedValues.grossAmount ?? reviewedValues.totalAmount,
    amount: reviewedValues.grossAmount ?? reviewedValues.amount,
    category: reviewedValues.accountingCategory ?? reviewedValues.category,
    accountingCategory: reviewedValues.accountingCategory ?? reviewedValues.category,
  };
};

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const resolveReviewedDraftType = ({ intake = {}, reviewedValues = {} } = {}) => {
  const action = intake.classification?.suggestedAction;
  const documentType = String(reviewedValues.documentType || intake.classification?.documentType || '')
    .toLowerCase();
  const direction = String(
    reviewedValues.businessDirection || intake.classification?.direction || '',
  ).toLowerCase();
  const unsupportedDocumentTypes = new Set([
    'bank_statement',
    'contract',
    'delivery_note',
    'offer',
    'quote',
    'tax_document',
    'unknown',
    'non_accounting',
  ]);

  if (unsupportedDocumentTypes.has(documentType)) {
    return null;
  }

  if (
    action === 'create_expense_draft' ||
    documentType === 'receipt' ||
    documentType === 'supplier_invoice' ||
    direction === 'incoming' ||
    direction === 'supplier_document'
  ) {
    return 'expense';
  }
  if (
    action === 'create_invoice_draft' ||
    documentType === 'customer_invoice' ||
    direction === 'outgoing' ||
    direction === 'customer_document'
  ) {
    return 'invoice';
  }
  return null;
};


const MANUAL_OVERRIDE_RISK_LEVELS = new Set(['low', 'medium', 'high']);

const normalizeManualOverrideText = (value, maxLength = 500) =>
  String(value || '').trim().slice(0, maxLength);

const validateManualOverride = (manualOverride = {}) => {
  const normalized = {
    shortDescription: normalizeManualOverrideText(manualOverride.shortDescription, 300),
    reason: normalizeManualOverrideText(manualOverride.reason, 800),
    riskLevel: String(manualOverride.riskLevel || '').trim().toLowerCase(),
    restrictedTaxTreatmentAcknowledged:
      manualOverride.restrictedTaxTreatmentAcknowledged === true,
  };

  const errors = [];
  if (!normalized.shortDescription) {
    errors.push('Manual override shortDescription is required.');
  }
  if (!normalized.reason) {
    errors.push('Manual override reason is required.');
  }
  if (!MANUAL_OVERRIDE_RISK_LEVELS.has(normalized.riskLevel)) {
    errors.push('Manual override riskLevel must be low, medium, or high.');
  }
  if (normalized.restrictedTaxTreatmentAcknowledged !== true) {
    errors.push('Manual override restricted tax treatment acknowledgement is required.');
  }

  return {
    valid: errors.length === 0,
    errors,
    manualOverride: normalized,
  };
};

const hasValidManualOverride = (manualOverride = {}) =>
  validateManualOverride(manualOverride).valid;

const buildRestrictedManualOverrideReviewedValues = ({
  reviewedValues = {},
  manualOverride = {},
} = {}) => {
  const validation = validateManualOverride(manualOverride);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(' '));
    error.status = 400;
    error.code = 'INVALID_MANUAL_OVERRIDE';
    error.errors = validation.errors;
    throw error;
  }

  const originalGrossAmount = toFiniteNumber(
    reviewedValues.grossAmount ?? reviewedValues.totalAmount ?? reviewedValues.amount,
    toFiniteNumber(reviewedValues.netAmount),
  );

  return {
    ...clonePlainObject(reviewedValues),
    shortDescription:
      reviewedValues.shortDescription ||
      reviewedValues.businessPurpose ||
      validation.manualOverride.shortDescription,
    businessPurpose:
      reviewedValues.businessPurpose ||
      reviewedValues.shortDescription ||
      validation.manualOverride.shortDescription,
    netAmount: originalGrossAmount,
    vatRate: 0,
    vatAmount: 0,
    grossAmount: originalGrossAmount,
    taxTreatment: 'no_vorsteuer_allowed',
    inputVatAllowed: false,
    accountantReviewRequired: true,
    manualOverride: validation.manualOverride,
  };
};

const buildReviewedExpenseDraftPayload = ({ reviewedValues = {}, documentId, systemContext = {} } = {}) => {
  const netAmount = toFiniteNumber(reviewedValues.netAmount);
  const vatRate = toFiniteNumber(reviewedValues.vatRate);
  const vatAmount = toFiniteNumber(reviewedValues.vatAmount, +(netAmount * vatRate).toFixed(2));
  const grossAmount = toFiniteNumber(reviewedValues.grossAmount, +(netAmount + vatAmount).toFixed(2));
  const description =
    reviewedValues.businessPurpose ||
    reviewedValues.shortDescription ||
    reviewedValues.documentNumber ||
    'Reviewed document draft';
  return {
    vendorName: reviewedValues.vendorName || reviewedValues.supplierName || 'Reviewed vendor',
    description,
    category: reviewedValues.accountingCategory || reviewedValues.category || 'uncategorized',
    expenseDate: reviewedValues.documentDate || reviewedValues.date || new Date().toISOString().slice(0, 10),
    currency: reviewedValues.currency || 'EUR',
    netAmount,
    vatRate,
    vatAmount,
    grossAmount,
    status: 'pending',
    source: 'ai_document_intake_reviewed',
    attachments: documentId ? [documentId] : [],
    notes: `Created from reviewed document values. Source document ID: ${documentId}.`,
    reason: systemContext.reason || 'Create draft from reviewed document values',
  };
};

const buildReviewedInvoiceDraftPayload = ({ reviewedValues = {}, documentId, systemContext = {} } = {}) => {
  const netAmount = toFiniteNumber(reviewedValues.netAmount ?? reviewedValues.grossAmount);
  const vatRate = toFiniteNumber(reviewedValues.vatRate);
  return {
    clientName: reviewedValues.customerName || reviewedValues.clientName || 'Reviewed customer',
    date: reviewedValues.documentDate || reviewedValues.date || new Date().toISOString().slice(0, 10),
    dueDate:
      reviewedValues.dueDate ||
      reviewedValues.documentDate ||
      reviewedValues.date ||
      new Date().toISOString().slice(0, 10),
    currency: reviewedValues.currency || 'EUR',
    status: 'DRAFT',
    notes: `Created from reviewed document values. Source document ID: ${documentId}.`,
    reason: systemContext.reason || 'Create draft from reviewed document values',
    attachments: documentId ? [documentId] : [],
    items: [
      {
        description:
          reviewedValues.businessPurpose ||
          reviewedValues.accountingCategory ||
          reviewedValues.documentNumber ||
          'Reviewed document line item',
        quantity: 1,
        unitPrice: netAmount,
        vatRate,
      },
    ],
  };
};

const normalizeComparisonValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(6)) : null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value) || typeof value === 'object') {
    return stableStringify(value);
  }
  const stringValue = String(value).trim();
  const numeric = Number(stringValue.replace(',', '.'));
  if (stringValue !== '' && Number.isFinite(numeric)) {
    return Number(numeric.toFixed(6));
  }
  return stringValue;
};

const compareReviewedFields = ({
  aiExtractedValues = {},
  reviewedValues = {},
  userId,
  timestamp,
  reason,
} = {}) =>
  Object.keys(reviewedValues)
    .filter((field) => field !== 'raw')
    .filter(
      (field) =>
        normalizeComparisonValue(aiExtractedValues[field]) !==
        normalizeComparisonValue(reviewedValues[field]),
    )
    .map((field) => ({
      field,
      aiValue: aiExtractedValues[field],
      correctedValue: reviewedValues[field],
      userId,
      timestamp,
      reason: reason || null,
    }));

const applyRecheckReviewGate = ({
  intake,
  aiExtractedValues,
  reviewedValues,
  fieldChanges,
  userId,
  reviewedAt,
} = {}) => {
  const reviewState = {
    status: 'rechecked',
    reviewRequired: true,
    reviewedByUserId: userId,
    reviewedAt,
    hasUserCorrections: fieldChanges.length > 0,
    criticalFieldsReviewed: true,
  };
  const editablePayload = {
    aiExtractedValues: clonePlainObject(aiExtractedValues),
    reviewedValues: clonePlainObject(reviewedValues),
    fieldChanges: clonePlainObject(fieldChanges),
  };
  const draftEligibleActions = new Set(['create_expense_draft', 'create_invoice_draft']);
  const hasBlockingValidation =
    intake.validation.errors.length > 0 || intake.validation.missingFields.length > 0;
  const reviewedDraftType = resolveReviewedDraftType({ intake, reviewedValues });
  const canCreateReviewedDraft =
    !hasBlockingValidation &&
    !!reviewedDraftType &&
    draftEligibleActions.has(intake.classification.suggestedAction);
  const draftEligibility = buildDraftEligibility({
    eligible: canCreateReviewedDraft,
    reason: canCreateReviewedDraft
      ? 'Reviewed fields were re-checked and can be used for draft creation.'
      : 'Reviewed fields still need correction or are not supported for draft creation.',
  });
  const decisionBase = {
    schemaVersion: 'document_lifecycle_decision.v1',
    classification: intake.classification,
    extracted: intake.extracted,
    validation: intake.validation,
    reviewState,
    editablePayload,
    draftEligibility,
  };
  const decisionFingerprint = buildDecisionFingerprint(decisionBase);
  return {
    ...intake,
    reviewState,
    editablePayload,
    draftEligibility,
    decisionFingerprint,
    lifecycle: {
      ...decisionBase,
      decisionFingerprint,
    },
  };
};

const inferDocumentType = ({ text = '', requestedType = 'auto', extracted = {} } = {}) => {
  if (requestedType && requestedType !== 'auto') {
    return requestedType;
  }
  const normalized = normalizeText(`${text} ${JSON.stringify(extracted || {})}`);
  if (/kontoauszug|bank statement|iban|bic|saldo|opening balance|closing balance|camt|mt940/.test(normalized)) {
    return 'bank_statement';
  }
  if (/quittung|receipt|kassenbon|beleg/.test(normalized)) {
    return 'receipt';
  }
  if (/steuerbescheid|finanzamt|ustva|umsatzsteuer|tax assessment|tax document/.test(normalized)) {
    return 'tax_document';
  }
  if (/rechnung|invoice|rg\s*[-#:]/.test(normalized)) {
    return 'invoice';
  }
  return extracted.type && extracted.type !== 'generic' ? extracted.type : 'generic';
};

const inferDirection = ({ text = '', extracted = {}, documentType }) => {
  const normalized = normalizeText(`${text} ${JSON.stringify(extracted || {})}`);
  if (documentType === 'receipt') {
    return 'supplier_document';
  }
  if (documentType === 'bank_statement') {
    return 'bank_document';
  }
  if (/lieferant|supplier|vendor|eingangsrechnung|zahlbar an|payable to/.test(normalized)) {
    return 'supplier_document';
  }
  if (/kunde|customer|client|ausgangsrechnung|bill to|invoice to/.test(normalized)) {
    return 'customer_document';
  }
  if (extracted.vendor && !extracted.clientName && !extracted.customerName) {
    return 'supplier_document';
  }
  if (extracted.clientName || extracted.customerName) {
    return 'customer_document';
  }
  return documentType === 'invoice' ? 'supplier_document' : 'unknown';
};

const normalizeExtractedFields = ({ text = '', extracted = {}, documentType }) => {
  const grossAmount = toNumber(
    extracted.grossAmount ?? extracted.totalAmount ?? extracted.amount ?? extracted.assessment,
  );
  const netAmount = toNumber(extracted.netAmount);
  const vatAmount = toNumber(extracted.vatAmount);
  const vatRate = normalizeVatRate(extracted.vatRate);
  return {
    documentType,
    vendorName: extracted.vendorName || extracted.vendor || null,
    customerName: extracted.customerName || extracted.clientName || null,
    documentNumber: extracted.invoiceNumber || extracted.documentNumber || null,
    documentDate: extracted.date || extracted.invoiceDate || extracted.expenseDate || null,
    dueDate: extracted.dueDate || null,
    currency: detectCurrency(text, extracted),
    netAmount,
    vatAmount,
    grossAmount,
    vatRate,
    iban: extracted.iban || null,
    taxNumber: extracted.taxNumber || null,
    vatId: extracted.vatId || extracted.vatID || extracted.ustId || null,
    accountNumber: extracted.accountNumber || null,
    period: extracted.period || null,
    openingBalance: toNumber(extracted.openingBalance),
    closingBalance: toNumber(extracted.closingBalance),
    lineItems: Array.isArray(extracted.items) ? extracted.items : [],
    category: extracted.category || null,
    accountingCategory: extracted.accountingCategory || extracted.category || null,
    businessPurpose: extracted.businessPurpose || null,
    paymentMethod: extracted.paymentMethod || null,
    taxTreatment: extracted.taxTreatment || null,
    raw: extracted,
  };
};

const validateGermanReadiness = ({ documentType, direction, extracted }) => {
  const errors = [];
  const warnings = [];
  const missingFields = [];
  const gross = toNumber(extracted.grossAmount);
  const net = toNumber(extracted.netAmount);
  const vat = toNumber(extracted.vatAmount);
  const vatRate = normalizeVatRate(extracted.vatRate);

  if (['invoice', 'receipt', 'tax_document'].includes(documentType) && !extracted.documentDate) {
    missingFields.push('documentDate');
    warnings.push('Document date was not detected.');
  }
  if (documentType === 'invoice' && !extracted.documentNumber) {
    missingFields.push('documentNumber');
    warnings.push('Invoice number was not detected; review UStG §14 readiness manually.');
  }
  if (direction === 'supplier_document' && !extracted.vendorName) {
    missingFields.push('vendorName');
    warnings.push('Vendor name was not detected.');
  }
  if (direction === 'customer_document' && !extracted.customerName) {
    missingFields.push('customerName');
    warnings.push('Customer name was not detected.');
  }
  if (documentType === 'bank_statement') {
    if (!extracted.accountNumber && !extracted.iban) {
      missingFields.push('accountNumber');
      warnings.push('Bank account identifier was not detected.');
    }
    if (!extracted.period) {
      missingFields.push('period');
      warnings.push('Bank statement period was not detected.');
    }
  }
  if (documentType === 'receipt') {
    if (!extracted.businessPurpose) {
      missingFields.push('businessPurpose');
      warnings.push('Business purpose is required before using this as an expense draft.');
    }
  }
  if (!extracted.currency) {
    warnings.push('Currency was not detected; EUR is assumed.');
  } else if (extracted.currency !== 'EUR') {
    warnings.push(`Currency ${extracted.currency} was detected; German VAT treatment needs review.`);
  }
  if (gross === null && documentType !== 'bank_statement') {
    missingFields.push('grossAmount');
    warnings.push('Gross amount was not detected.');
  }
  if (vatRate !== null && ![0, 0.07, 0.19].some((rate) => Math.abs(rate - vatRate) < 0.001)) {
    warnings.push('VAT rate is not one of the common German rates 0%, 7%, or 19%.');
  }
  if (net !== null && vat !== null && gross !== null && Math.abs(net + vat - gross) > 0.03) {
    errors.push('Net + VAT does not match gross amount.');
  }
  if (documentType !== 'bank_statement' && vat === null) {
    warnings.push('VAT amount was not detected; input/output VAT needs review.');
  }

  const status = errors.length
    ? 'needs_correction'
    : missingFields.length
      ? 'needs_review'
      : warnings.length
        ? 'needs_review'
        : 'ready_for_review';

  return {
    status,
    errors,
    warnings,
    missingFields: [...new Set(missingFields)],
    germanCompliance: {
      ustg14Ready:
        documentType === 'invoice' &&
        !!extracted.documentNumber &&
        !!extracted.documentDate &&
        !!gross &&
        (direction === 'supplier_document' ? !!extracted.vendorName : !!extracted.customerName),
      gobdArchiveReady: true,
      vatMathValid: !errors.some((item) => item.includes('Net + VAT')),
      currencyValid: extracted.currency === 'EUR',
      finalLegalCompliance: false,
    },
  };
};

const deriveCategory = ({ text = '', extracted = {} } = {}) => {
  if (extracted.accountingCategory || extracted.category) {
    return {
      category: extracted.accountingCategory || extracted.category,
      confidence: 1,
    };
  }
  const normalized = normalizeText(`${text} ${extracted.vendorName || ''}`);
  const rules = [
    ['travel', /hotel|bahn|flight|taxi|uber|reise|fahrt/],
    ['software_services', /hosting|saas|subscription|cloud|software/],
    ['office_supplies', /office|büro|buero|papier|printer|stationery/],
    ['utilities', /strom|gas|internet|telekom|electricity/],
    ['bank_fees', /gebühr|gebuehr|fee|konto|bank/],
  ];
  const matched = rules.find(([, pattern]) => pattern.test(normalized));
  return {
    category: matched ? matched[0] : 'uncategorized',
    confidence: matched ? 0.68 : 0.25,
  };
};

const chooseSuggestedAction = ({ documentType, direction, validation }) => {
  if (validation.errors.length) {
    return 'needs_correction';
  }
  if (documentType === 'bank_statement') {
    return 'bank_statement_dry_run';
  }
  if (validation.missingFields.length >= 3) {
    return 'ask_missing_data';
  }
  if (documentType === 'receipt' || direction === 'supplier_document') {
    return 'create_expense_draft';
  }
  if (documentType === 'invoice' && direction === 'customer_document') {
    return 'create_invoice_draft';
  }
  if (documentType === 'generic') {
    return validation.missingFields.length ? 'ask_missing_data' : 'unsupported_document';
  }
  return 'ask_missing_data';
};

const buildDraftPayload = ({ action, extracted, documentId, category }) => {
  if (action === 'create_expense_draft') {
    return {
      targetRoute: 'POST /api/expenses',
      payload: {
        source: 'ocr',
        status: 'pending',
        vendorName: extracted.vendorName,
        expenseDate: extracted.documentDate,
        category: category.category,
        description: extracted.documentNumber
          ? `OCR document ${extracted.documentNumber}`
          : 'OCR document intake',
        netAmount: extracted.netAmount,
        vatAmount: extracted.vatAmount,
        grossAmount: extracted.grossAmount,
        vatRate: extracted.vatRate,
        currency: extracted.currency,
        attachments: documentId ? [documentId] : [],
        systemContext: { source: 'ai_document_intake', documentId },
        reason: 'User must confirm AI document intake suggestion',
      },
    };
  }
  if (action === 'create_invoice_draft') {
    return {
      targetRoute: 'POST /api/invoices',
      payload: {
        status: 'draft',
        clientName: extracted.customerName,
        date: extracted.documentDate,
        dueDate: extracted.dueDate || extracted.documentDate,
        currency: extracted.currency,
        notes: 'Draft suggested from AI document intake. Review before sending.',
        items: [
          {
            description: extracted.documentNumber
              ? `OCR document ${extracted.documentNumber}`
              : 'OCR document intake',
            quantity: 1,
            unitPrice: extracted.netAmount ?? extracted.grossAmount ?? 0,
            vatRate: extracted.vatRate ?? 0,
          },
        ],
        attachments: documentId ? [documentId] : [],
      },
    };
  }
  if (action === 'bank_statement_dry_run') {
    return {
      targetRoute: 'POST /api/bank-statements/import?dryRun=true',
      payload: {
        documentId,
        format: 'OCR',
      },
    };
  }
  return {
    targetRoute: null,
    payload: {
      documentId,
      reason: 'Missing or unsupported document data requires human review before drafting.',
    },
  };
};

function analyzeIntake({ text = '', extractedData = {}, documentType = 'auto', documentId = null } = {}) {
  const inferredType = inferDocumentType({ text, requestedType: documentType, extracted: extractedData });
  const direction = inferDirection({ text, extracted: extractedData, documentType: inferredType });
  const extracted = normalizeExtractedFields({ text, extracted: extractedData, documentType: inferredType });
  const validation = validateGermanReadiness({ documentType: inferredType, direction, extracted });
  const category = deriveCategory({ text, extracted });
  const suggestedAction = chooseSuggestedAction({
    documentType: inferredType,
    direction,
    validation,
  });
  const confidence =
    validation.errors.length || inferredType === 'generic'
      ? 'low'
      : validation.missingFields.length || validation.warnings.length
        ? 'medium'
        : 'high';
  const action = SUPPORTED_ACTIONS.has(suggestedAction) ? suggestedAction : 'ask_missing_data';
  const reviewGate = buildReviewGate({ aiExtractedValues: extracted });

  return {
    classification: {
      documentType: inferredType,
      direction,
      category: category.category,
      categoryConfidence: category.confidence,
      suggestedAction: action,
      confidence,
    },
    extracted,
    ...reviewGate,
    validation,
    draft: buildDraftPayload({ action, extracted, documentId, category }),
    audit: {
      advisoryOnly: true,
      requiresHumanConfirmation: true,
      blockedActions: ['post', 'approve', 'delete', 'reconcile'],
    },
  };
}

module.exports = {
  analyzeIntake,
  inferDocumentType,
  validateGermanReadiness,
  buildReviewGate,
  buildDecisionFingerprint,
  mapReviewedDocumentType,
  mapReviewedValuesToExtractedData,
  resolveReviewedDraftType,
  buildReviewedExpenseDraftPayload,
  buildReviewedInvoiceDraftPayload,
  validateManualOverride,
  hasValidManualOverride,
  buildRestrictedManualOverrideReviewedValues,
  compareReviewedFields,
  applyRecheckReviewGate,
};
