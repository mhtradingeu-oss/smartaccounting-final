'use strict';

const KNOWLEDGE_CONTRACT_VERSION = '1.0.0';

const GERMAN_ACCOUNTING_KNOWLEDGE_SCOPE = Object.freeze({
  jurisdiction: 'Germany',
  mode: 'evidence_based_advisory',
  bindingAdvicePolicy:
    'The assistant provides non-binding accounting and VAT review guidance from supplied system data only. Filing, payment, legal classification, and tax optimization decisions must be confirmed by a qualified Steuerberater.',
  sourceOfTruthPolicy:
    'Use posted journal entries, company-scoped records, audit logs, and explicit report outputs as system truth. Operational data may be used for workflow signals but must not override posted accounting truth.',
});

const KNOWLEDGE_AREAS = Object.freeze([
  {
    id: 'gobd',
    label: 'GoBD traceability and audit trail',
    topics: ['immutability expectation', 'audit trail', 'evidence retention', 'source document review'],
    systemEvidence: ['AuditLog', 'FileAttachment', 'AIInsight evidence', 'posted JournalEntry metadata'],
    assistantUse: [
      'explain whether evidence is missing',
      'highlight audit trail gaps',
      'recommend safe review and documentation actions',
    ],
    mustEscalate: ['certifying GoBD compliance', 'legal conclusions about archive sufficiency'],
  },
  {
    id: 'ustg_vat',
    label: 'UStG / Umsatzsteuer / VAT review',
    topics: ['UStG §14 invoice readiness', 'UStG §15 input VAT review', '0%, 7%, 19% VAT rates', 'VAT payable/refundable position'],
    systemEvidence: ['VAT summary report', 'JournalEntryLine taxCode/vatRate', 'Document intake validation', 'Expense VAT fields'],
    assistantUse: [
      'summarize input VAT and output VAT from posted entries',
      'identify VAT rate mismatch, rounding, missing VAT evidence, or non-EUR review needs',
      'explain why VAT treatment requires accountant review',
    ],
    mustEscalate: ['UStVA filing', 'VAT payment decisions', 'final input VAT deductibility', 'binding tax classification'],
  },
  {
    id: 'datev',
    label: 'DATEV export readiness',
    topics: ['DATEV workflow readiness', 'stable export fields', 'account mapping review', 'VAT account consistency'],
    systemEvidence: ['DATEV export output', 'ChartAccount mappings', 'posted journal entries', 'VAT accounts'],
    assistantUse: [
      'explain missing or suspicious export data',
      'highlight mapping or VAT account review needs',
      'summarize export readiness gaps',
    ],
    mustEscalate: ['submitting exports externally', 'changing tax mappings automatically'],
  },
  {
    id: 'hgb_bookkeeping',
    label: 'HGB bookkeeping principles',
    topics: ['HGB §238 bookkeeping traceability', 'double-entry accounting', 'balance sheet equality'],
    systemEvidence: ['Trial balance', 'Profit and loss', 'Balance sheet', 'General ledger', 'Account ledger'],
    assistantUse: [
      'explain report totals',
      'identify balance sheet imbalance',
      'compare dashboard operational values with posted accounting truth',
    ],
    mustEscalate: ['certifying financial statements', 'closing periods without accountant review'],
  },
  {
    id: 'posting_truth',
    label: 'Posted journal-entry accounting truth',
    topics: ['posted-only reports', 'draft vs posted separation', 'debit/credit balancing', 'source evidence links'],
    systemEvidence: ['JournalEntry', 'JournalEntryLine', 'ChartAccount', 'reports based on posted entries'],
    assistantUse: [
      'explain posted vs draft differences',
      'identify source type and evidence gaps',
      'recommend reviewing debit/credit and source records',
    ],
    mustEscalate: ['posting entries', 'reversing entries', 'changing chart of accounts automatically'],
  },
  {
    id: 'daily_operations',
    label: 'Daily accounting operations',
    topics: ['invoices', 'expenses', 'bank statements', 'reconciliation', 'cash-flow risk', 'overdue risk'],
    systemEvidence: ['Invoice', 'Expense', 'BankStatement', 'BankTransaction', 'AI automation findings', 'Dashboard auditReadiness'],
    assistantUse: [
      'prioritize overdue invoices',
      'highlight unreconciled bank transactions',
      'summarize expense and document review tasks',
      'rank risks by severity and confidence when available',
    ],
    mustEscalate: ['automatic reconciliation', 'automatic booking', 'payment execution', 'deleting or hiding records'],
  },
]);

function getGermanAccountingKnowledgeContract() {
  return {
    version: KNOWLEDGE_CONTRACT_VERSION,
    scope: GERMAN_ACCOUNTING_KNOWLEDGE_SCOPE,
    knowledgeAreas: KNOWLEDGE_AREAS,
  };
}

function listGermanAccountingKnowledgeAreaIds() {
  return KNOWLEDGE_AREAS.map((area) => area.id);
}

function findGermanAccountingKnowledgeArea(id) {
  return KNOWLEDGE_AREAS.find((area) => area.id === id) || null;
}

module.exports = {
  KNOWLEDGE_CONTRACT_VERSION,
  GERMAN_ACCOUNTING_KNOWLEDGE_SCOPE,
  KNOWLEDGE_AREAS,
  getGermanAccountingKnowledgeContract,
  listGermanAccountingKnowledgeAreaIds,
  findGermanAccountingKnowledgeArea,
};
