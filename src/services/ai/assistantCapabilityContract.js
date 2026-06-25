'use strict';

const CAPABILITY_CONTRACT_VERSION = '1.0.0';

const ASSISTANT_MODE = Object.freeze({
  mode: 'read_only_advisory',
  mutationPolicy: 'never_mutate_without_explicit_human_controlled_endpoint',
  taxPolicy:
    'Provide accounting and VAT review guidance from supplied evidence only; do not provide binding tax filing, payment, or legal conclusions. Escalate compliance-critical decisions to a qualified Steuerberater.',
  evidencePolicy:
    'Use only company-scoped supplied records and returned application data. Never invent amounts, dates, tax positions, counterparties, filings, or legal conclusions.',
});

const CAPABILITIES = Object.freeze([
  {
    id: 'invoices',
    label: 'Invoices',
    coverage: 'review_and_explain',
    dataSources: ['Invoice', 'InvoiceItem', 'AuditLog'],
    canHelpWith: [
      'summarize invoice status and totals',
      'identify overdue or pending invoices',
      'explain VAT fields when present',
      'highlight missing invoice evidence',
      'suggest safe review actions',
    ],
    mustNotDo: ['create invoices', 'send invoices', 'change invoice status', 'submit tax filings'],
    legalContext: ['GoBD audit trail', 'UStG §14 invoice readiness'],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    coverage: 'review_and_explain',
    dataSources: ['Expense', 'FileAttachment', 'JournalEntry preview', 'AuditLog'],
    canHelpWith: [
      'summarize booked and pending expenses',
      'review gross/net/VAT consistency',
      'explain restricted input VAT treatment',
      'identify missing supporting documents',
      'suggest accountant review when tax treatment is uncertain',
    ],
    mustNotDo: ['book expenses automatically', 'claim input VAT definitively', 'post journal entries'],
    legalContext: ['GoBD evidence retention', 'UStG input VAT review'],
  },
  {
    id: 'bank_reconciliation',
    label: 'Bank reconciliation',
    coverage: 'review_and_explain',
    dataSources: ['BankStatement', 'BankTransaction', 'LedgerTransaction', 'AuditLog'],
    canHelpWith: [
      'identify unreconciled bank transactions',
      'explain possible invoice or expense matches',
      'summarize reconciliation gaps',
      'recommend safe manual review actions',
    ],
    mustNotDo: ['reconcile transactions automatically', 'undo reconciliation', 'change ledger links'],
    legalContext: ['GoBD traceability', 'audit log review'],
  },
  {
    id: 'vat',
    label: 'VAT / Umsatzsteuer',
    coverage: 'review_and_explain',
    dataSources: ['posted JournalEntryLine tax fields', 'VAT summary report', 'Document intake validation'],
    canHelpWith: [
      'summarize input VAT and output VAT',
      'identify VAT rate mismatches or rounding risks',
      'explain VAT payable/refundable position from posted entries',
      'highlight missing VAT evidence or non-EUR review needs',
    ],
    mustNotDo: ['file UStVA', 'pay VAT', 'guarantee deductible input VAT', 'give binding tax advice'],
    legalContext: ['UStG §14', 'UStG §15', 'German VAT rates 0%, 7%, 19%'],
  },
  {
    id: 'financial_reports',
    label: 'Financial reports',
    coverage: 'review_and_explain',
    dataSources: [
      'trial balance',
      'profit and loss',
      'balance sheet',
      'general ledger',
      'account ledger',
      'VAT summary',
    ],
    canHelpWith: [
      'explain report totals',
      'identify balance sheet imbalance',
      'compare operational dashboard values with posted journal-entry truth',
      'summarize reporting data gaps',
    ],
    mustNotDo: ['alter posted reports', 'close periods', 'certify financial statements'],
    legalContext: ['HGB §238 bookkeeping principles', 'GoBD traceability'],
  },
  {
    id: 'journal_entries',
    label: 'Journal entries',
    coverage: 'review_and_explain',
    dataSources: ['JournalEntry', 'JournalEntryLine', 'ChartAccount', 'AuditLog'],
    canHelpWith: [
      'explain posted and draft journal entries',
      'review debit/credit balance',
      'identify source type and evidence references',
      'explain reversal/audit trail requirements',
    ],
    mustNotDo: ['post entries', 'reverse entries', 'change chart of accounts'],
    legalContext: ['double-entry accounting', 'GoBD immutability expectations'],
  },
  {
    id: 'datev_export_readiness',
    label: 'DATEV export readiness',
    coverage: 'review_and_explain',
    dataSources: ['DATEV export data', 'ChartAccount', 'posted journal entries', 'VAT accounts'],
    canHelpWith: [
      'review export readiness',
      'explain missing account mappings',
      'highlight VAT account consistency issues',
      'summarize export data gaps',
    ],
    mustNotDo: ['submit DATEV exports externally', 'change tax mappings automatically'],
    legalContext: ['DATEV workflow readiness', 'GoBD export traceability'],
  },
  {
    id: 'audit_readiness',
    label: 'Audit readiness',
    coverage: 'review_and_explain',
    dataSources: ['Dashboard auditReadiness', 'AIInsight', 'AuditLog', 'reports'],
    canHelpWith: [
      'summarize deterministic audit readiness signals',
      'rank risks by severity',
      'explain evidence and source records',
      'recommend safe next review actions',
    ],
    mustNotDo: ['certify compliance', 'make legal conclusions', 'hide or delete audit events'],
    legalContext: ['GoBD §146', 'GoBD §147', 'HGB §238'],
  },
  {
    id: 'document_intake',
    label: 'Document intake',
    coverage: 'review_and_prepare',
    dataSources: ['OCR/document intake output', 'FileAttachment', 'reviewed values'],
    canHelpWith: [
      'extract and explain detected fields',
      'identify missing invoice numbers, vendors, dates, amounts, VAT fields',
      'prepare draft suggestions for human confirmation',
      'flag restricted VAT treatment',
    ],
    mustNotDo: ['create final records without confirmation', 'assume legal VAT deductibility'],
    legalContext: ['UStG §14 readiness', 'GoBD archive readiness'],
  },
]);

function getAssistantCapabilityContract() {
  return {
    version: CAPABILITY_CONTRACT_VERSION,
    mode: ASSISTANT_MODE,
    capabilities: CAPABILITIES,
  };
}

function listAssistantCapabilityIds() {
  return CAPABILITIES.map((capability) => capability.id);
}

function findAssistantCapability(id) {
  return CAPABILITIES.find((capability) => capability.id === id) || null;
}

module.exports = {
  CAPABILITY_CONTRACT_VERSION,
  ASSISTANT_MODE,
  CAPABILITIES,
  getAssistantCapabilityContract,
  listAssistantCapabilityIds,
  findAssistantCapability,
};
