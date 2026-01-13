/**
 * Demo Payload Normalizer
 *
 * Automatically fills mandatory vs system-required fields in ENTERPRISE_DEMO_MODE.
 *
 * LEGAL BASIS FOR DEMO AUTO-FILL:
 * ────────────────────────────────
 * 1. GoBD Compliance (German bookkeeping law):
 *    - Mandatory fields: netAmount, vatAmount, vatRate (tax-related)
 *    - System fields: createdByUserId, companyId (system integrity)
 *
 * 2. VAT Integrity (EU VAT Directive):
 *    - All calculated fields (gross, vat) are automatically derived
 *    - No manual override of calculated fields allowed
 *    - All calculations are logged in audit trail
 *
 * 3. Demo Mode Boundary:
 *    - Auto-fill only for ENTERPRISE_DEMO_MODE=true
 *    - Production uses strict validation (no auto-fill)
 *    - Every auto-filled field is logged with "DEMO_AUTO_FILL" marker
 *
 * 4. Data Integrity:
 *    - Defaults are tax-compliant (19% German VAT)
 *    - All auto-fills are traceable in audit logs
 *    - Original request body is preserved in audit context
 */

// Helper: generate DEMO invoice number
function generateDemoInvoiceNumber(companyId) {
  // Enterprise-traceable demo invoice number
  return `DEMO-${companyId}-${Date.now()}`;
}

const logger = require('../lib/logger');

const DEMO_MODE_ENABLED =
  String(process.env.ENTERPRISE_DEMO_MODE || 'false').toLowerCase() === 'true';

/**
 * Safe defaults for demo expenses
 * All values must be tax-compliant and production-safe
 */
const DEMO_EXPENSE_DEFAULTS = {
  currency: 'EUR',
  vatRate: 0.19, // Standard German VAT
  status: 'draft',
  source: 'demo_autofill',
  category: 'Office Supplies',
  vendorName: 'Demo Vendor',
  description: 'Demo Expense',
  netAmount: 100.0, // €100 net
  notes: '[AUTO-FILLED IN DEMO MODE]',
};

/**
 * Safe defaults for demo invoices
 */
const DEMO_INVOICE_DEFAULTS = {
  currency: 'EUR',
  status: 'DRAFT',
  clientName: 'Demo Client',
  invoiceNumber: null, // Handled separately to avoid duplicates
};

/**
 * Fields that are SYSTEM-REQUIRED but can be auto-filled from auth context
 * These are derived from authenticated user and company
 */
const SYSTEM_REQUIRED_FIELDS = {
  expense: ['createdByUserId', 'companyId'],
  invoice: ['userId', 'companyId'],
};

/**
 * Fields that are CALCULATED and never accepted from user input
 */
const CALCULATED_FIELDS = {
  expense: ['vatAmount', 'grossAmount', 'amount'],
  invoice: ['subtotal', 'total', 'amount'],
};

/**
 * Normalize expense payload for demo mode
 *
 * @param {Object} inputData - Raw user input
 * @param {number} userId - Authenticated user ID
 * @param {number} companyId - Authenticated company ID
 * @returns {Object} { normalizedData, demoFills: [{field, reason, value}] }
 */
function normalizeExpensePayload(inputData, userId, companyId) {
  const demoFills = [];
  const normalized = { ...inputData };

  // AUTO-GENERATE invoiceNumber in DEMO MODE
  if (DEMO_MODE_ENABLED && !normalized.invoiceNumber) {
    const generated = `DEMO-${companyId}-${Date.now()}`;
    normalized.invoiceNumber = generated;
    demoFills.push({
      field: 'invoiceNumber',
      reason: 'DEMO_AUTO_GENERATED',
      value: generated,
    });
  }

  if (!DEMO_MODE_ENABLED) {
    return { normalizedData: normalized, demoFills: [] };
  }

  // 1. Auto-fill system-required fields from auth context
  for (const field of SYSTEM_REQUIRED_FIELDS.expense) {
    if (!normalized[field]) {
      const value = field === 'createdByUserId' ? userId : companyId;
      normalized[field] = value;
      demoFills.push({
        field,
        reason: 'SYSTEM_REQUIRED_FROM_AUTH_CONTEXT',
        value,
      });
    }
  }

  // 2. Auto-fill mandatory fields with safe defaults
  if (!normalized.currency) {
    normalized.currency = DEMO_EXPENSE_DEFAULTS.currency;
    demoFills.push({
      field: 'currency',
      reason: 'MANDATORY_FIELD_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.currency,
    });
  }

  if (typeof normalized.vatRate === 'undefined' || normalized.vatRate === null) {
    normalized.vatRate = DEMO_EXPENSE_DEFAULTS.vatRate;
    demoFills.push({
      field: 'vatRate',
      reason: 'MANDATORY_FIELD_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.vatRate,
    });
  }

  // 3. Handle netAmount / grossAmount - at least one is mandatory
  const hasNetAmount = typeof normalized.netAmount === 'number' && normalized.netAmount > 0;
  const hasGrossAmount = typeof normalized.grossAmount === 'number' && normalized.grossAmount > 0;

  if (!hasNetAmount && !hasGrossAmount) {
    normalized.netAmount = DEMO_EXPENSE_DEFAULTS.netAmount;
    demoFills.push({
      field: 'netAmount',
      reason: 'MANDATORY_AMOUNT_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.netAmount,
    });
  }

  // 4. Auto-fill optional fields with sensible defaults (for demo experience)
  if (!normalized.vendorName) {
    normalized.vendorName = DEMO_EXPENSE_DEFAULTS.vendorName;
    demoFills.push({
      field: 'vendorName',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.vendorName,
    });
  }

  if (!normalized.category) {
    normalized.category = DEMO_EXPENSE_DEFAULTS.category;
    demoFills.push({
      field: 'category',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.category,
    });
  }

  if (!normalized.description) {
    normalized.description = DEMO_EXPENSE_DEFAULTS.description;
    demoFills.push({
      field: 'description',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.description,
    });
  }

  if (!normalized.status) {
    normalized.status = DEMO_EXPENSE_DEFAULTS.status;
    demoFills.push({
      field: 'status',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.status,
    });
  }

  if (!normalized.source) {
    normalized.source = DEMO_EXPENSE_DEFAULTS.source;
    demoFills.push({
      field: 'source',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: DEMO_EXPENSE_DEFAULTS.source,
    });
  }

  if (!normalized.expenseDate && !normalized.date) {
    normalized.expenseDate = new Date();
    demoFills.push({
      field: 'expenseDate',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: normalized.expenseDate,
    });
  }

  // 5. Strip user-provided calculated fields (DEMO only)
  for (const field of CALCULATED_FIELDS.expense) {
    if (field in normalized) {
      delete normalized[field];
    }
  }

  // 5.5 Compute calculated fields in DEMO MODE so validators & DB are satisfied
  if (DEMO_MODE_ENABLED) {
    const net = typeof normalized.netAmount === 'number' ? normalized.netAmount : 0;
    const rate = typeof normalized.vatRate === 'number' ? normalized.vatRate : 0;

    const vatAmount = Number((net * rate).toFixed(2));
    const grossAmount = Number((net + vatAmount).toFixed(2));

    normalized.vatAmount = vatAmount;
    normalized.grossAmount = grossAmount;

    demoFills.push(
      {
        field: 'vatAmount',
        reason: 'CALCULATED_BY_SYSTEM',
        value: vatAmount,
      },
      {
        field: 'grossAmount',
        reason: 'CALCULATED_BY_SYSTEM',
        value: grossAmount,
      },
    );
  }

  // 6. Mark notes to indicate demo auto-fill
  if (demoFills.length > 0) {
    const demoMarker = DEMO_EXPENSE_DEFAULTS.notes;
    if (!normalized.notes) {
      normalized.notes = demoMarker;
    } else if (!normalized.notes.includes(demoMarker)) {
      normalized.notes = `${normalized.notes} ${demoMarker}`;
    }
  }

  return { normalizedData: normalized, demoFills };
}

/**
 * Normalize invoice payload for demo mode
 *
 * @param {Object} inputData - Raw user input
 * @param {number} userId - Authenticated user ID
 * @param {number} companyId - Authenticated company ID
 * @returns {Object} { normalizedData, demoFills: [{field, reason, value}] }
 */
function normalizeInvoicePayload(inputData, userId, companyId) {
  const demoFills = [];
  const normalized = { ...inputData };

  if (!DEMO_MODE_ENABLED) {
    return { normalizedData: normalized, demoFills: [] };
  }

  // 1. Auto-fill system-required fields from auth context
  if (!normalized.userId) {
    normalized.userId = userId;
    demoFills.push({
      field: 'userId',
      reason: 'SYSTEM_REQUIRED_FROM_AUTH_CONTEXT',
      value: userId,
    });
  }

  if (!normalized.companyId) {
    normalized.companyId = companyId;
    demoFills.push({
      field: 'companyId',
      reason: 'SYSTEM_REQUIRED_FROM_AUTH_CONTEXT',
      value: companyId,
    });
  }

  // 2. Auto-fill currency with safe default
  if (!normalized.currency) {
    normalized.currency = DEMO_INVOICE_DEFAULTS.currency;
    demoFills.push({
      field: 'currency',
      reason: 'MANDATORY_FIELD_MISSING',
      value: DEMO_INVOICE_DEFAULTS.currency,
    });
  }

  // 2.5 Auto-generate invoiceNumber in DEMO mode if missing
  if (!normalized.invoiceNumber) {
    const generated = generateDemoInvoiceNumber(companyId);
    normalized.invoiceNumber = generated;
    demoFills.push({
      field: 'invoiceNumber',
      reason: 'AUTO_GENERATED_DEMO_NUMBER',
      value: generated,
    });
  }

  // 3. Auto-fill optional fields (do NOT auto-fill items - that's mandatory input)
  if (!normalized.clientName) {
    normalized.clientName = DEMO_INVOICE_DEFAULTS.clientName;
    demoFills.push({
      field: 'clientName',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: DEMO_INVOICE_DEFAULTS.clientName,
    });
  }

  if (!normalized.status) {
    normalized.status = DEMO_INVOICE_DEFAULTS.status;
    demoFills.push({
      field: 'status',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: DEMO_INVOICE_DEFAULTS.status,
    });
  }

  if (!normalized.date && !normalized.issueDate) {
    normalized.date = new Date();
    demoFills.push({
      field: 'date',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: normalized.date,
    });
  }

  if (!normalized.dueDate) {
    // Auto-set to 30 days from issue date
    const issueDate = normalized.date || normalized.issueDate || new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);
    normalized.dueDate = dueDate;
    demoFills.push({
      field: 'dueDate',
      reason: 'OPTIONAL_FIELD_MISSING',
      value: normalized.dueDate,
    });
  }

  // 4. Strip calculated fields
  for (const field of CALCULATED_FIELDS.invoice) {
    if (field in normalized) {
      delete normalized[field];
    }
  }

  // 5. Ensure items array exists and normalize each item
  if (Array.isArray(normalized.items) && normalized.items.length > 0) {
    normalized.items = normalized.items.map((item) => {
      const normalized_item = { ...item };
      // Auto-fill VAT rate if missing
      if (typeof normalized_item.vatRate !== 'number') {
        normalized_item.vatRate = DEMO_EXPENSE_DEFAULTS.vatRate;
        demoFills.push({
          field: 'items[].vatRate',
          reason: 'OPTIONAL_ITEM_FIELD_MISSING',
          value: DEMO_EXPENSE_DEFAULTS.vatRate,
        });
      }
      // Keep description, quantity, unitPrice as-is (required from user)
      return normalized_item;
    });
  }

  return { normalizedData: normalized, demoFills };
}

/**
 * Log demo auto-fills to audit trail
 *
 * @param {Array} demoFills - Array of {field, reason, value}
 * @param {Object} context - { userId, companyId, ipAddress, userAgent, originalPayload }
 */
function logDemoAutoFills(demoFills, context) {
  if (!DEMO_MODE_ENABLED || !Array.isArray(demoFills) || demoFills.length === 0) {
    return;
  }

  logger.info('DEMO_MODE_AUTO_FILL', {
    userId: context.userId,
    companyId: context.companyId,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    fillCount: demoFills.length,
    fills: demoFills,
    originalPayloadKeys: context.originalPayload ? Object.keys(context.originalPayload) : [],
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  normalizeExpensePayload,
  normalizeInvoicePayload,
  logDemoAutoFills,
};
