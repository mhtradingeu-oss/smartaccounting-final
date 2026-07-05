const TOOL_RISK_LEVELS = Object.freeze({
  READ_ONLY: 'read_only',
  DRAFT_WRITE: 'draft_write',
  APPROVAL_REQUIRED: 'approval_required',
  HIGH_RISK: 'high_risk',
  FORBIDDEN: 'forbidden',
});

const TOOL_EXECUTION_MODES = Object.freeze({
  READ: 'read',
  PROPOSE: 'propose',
  PREPARE_DRAFT: 'prepare_draft',
  EXECUTE_WITH_APPROVAL: 'execute_with_approval',
  BLOCKED: 'blocked',
});

const AI_TOOL_REGISTRY = Object.freeze({
  read_dashboard: {
    id: 'read_dashboard',
    label: 'Read dashboard accounting overview',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/dashboard/stats',
    description: 'Read company-scoped dashboard accounting context for advisory answers.',
  },

  read_invoices: {
    id: 'read_invoices',
    label: 'Read invoices',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/invoices',
    description: 'Read company-scoped invoices and invoice status context.',
  },

  read_expenses: {
    id: 'read_expenses',
    label: 'Read expenses',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/expenses',
    description: 'Read company-scoped expenses for advisory review.',
  },

  read_bank_statements: {
    id: 'read_bank_statements',
    label: 'Read bank statements and transactions',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/bank-statements',
    description: 'Read bank statements, transactions, duplicate warnings, and reconciliation context.',
  },

  read_journal_entries: {
    id: 'read_journal_entries',
    label: 'Read journal entries',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/journal-entries',
    description: 'Read posted and draft journal entries without changing accounting records.',
  },

  read_reports: {
    id: 'read_reports',
    label: 'Read accounting reports',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/reports/*',
    description: 'Read reports derived from posted journal entries.',
  },

  read_vat_summary: {
    id: 'read_vat_summary',
    label: 'Read VAT summary',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/reports/vat-summary',
    description: 'Read VAT summary from posted accounting data for preparation-only guidance.',
  },

  read_datev_readiness: {
    id: 'read_datev_readiness',
    label: 'Read DATEV readiness',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'GET /api/tax-bridge/readiness',
    description: 'Read DATEV-compatible export preparation readiness. No direct upload.',
  },

  read_audit_logs: {
    id: 'read_audit_logs',
    label: 'Read audit logs',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.READ,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor'],
    routeHint: 'GET /api/exports/audit-logs',
    description: 'Read audit evidence for explainability and review.',
  },

  analyze_document_intake: {
    id: 'analyze_document_intake',
    label: 'Analyze document intake',
    riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
    executionMode: TOOL_EXECUTION_MODES.PROPOSE,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor', 'viewer'],
    routeHint: 'POST /api/ocr/intake/analyze',
    description: 'Analyze a document and return advisory-only draft suggestions without creating records.',
    blockedActions: ['post', 'approve', 'delete', 'reconcile', 'submit_tax', 'pay'],
  },

  create_invoice_draft_from_reviewed_document: {
    id: 'create_invoice_draft_from_reviewed_document',
    label: 'Create invoice draft from reviewed document',
    riskLevel: TOOL_RISK_LEVELS.DRAFT_WRITE,
    executionMode: TOOL_EXECUTION_MODES.PREPARE_DRAFT,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant'],
    routeHint: 'POST /api/ocr/intake/:documentId/create-draft',
    description: 'Create an invoice draft only after reviewed document values and explicit human approval.',
    forbiddenWithoutApproval: true,
    finalPosting: false,
  },

  create_expense_draft_from_reviewed_document: {
    id: 'create_expense_draft_from_reviewed_document',
    label: 'Create expense draft from reviewed document',
    riskLevel: TOOL_RISK_LEVELS.DRAFT_WRITE,
    executionMode: TOOL_EXECUTION_MODES.PREPARE_DRAFT,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant'],
    routeHint: 'POST /api/ocr/intake/:documentId/create-draft',
    description: 'Create an expense draft only after reviewed document values and explicit human approval.',
    forbiddenWithoutApproval: true,
    finalPosting: false,
  },

  prepare_bank_reconciliation_proposal: {
    id: 'prepare_bank_reconciliation_proposal',
    label: 'Prepare bank reconciliation proposal',
    riskLevel: TOOL_RISK_LEVELS.APPROVAL_REQUIRED,
    executionMode: TOOL_EXECUTION_MODES.PROPOSE,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant'],
    routeHint: 'No direct execution route',
    description: 'Prepare a reconciliation proposal. AI must not finalize reconciliation automatically.',
    finalPosting: false,
  },

  prepare_datev_export_package: {
    id: 'prepare_datev_export_package',
    label: 'Prepare DATEV-compatible export package',
    riskLevel: TOOL_RISK_LEVELS.APPROVAL_REQUIRED,
    executionMode: TOOL_EXECUTION_MODES.PROPOSE,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: ['admin', 'accountant', 'auditor'],
    routeHint: 'GET /api/exports/datev',
    description: 'Prepare/download DATEV-compatible export data for Steuerberater review. No direct DATEV upload.',
    directExternalSubmission: false,
  },

  post_expense_to_ledger: {
    id: 'post_expense_to_ledger',
    label: 'Post expense to ledger',
    riskLevel: TOOL_RISK_LEVELS.HIGH_RISK,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'POST /api/expenses/:expenseId/post',
    description: 'High-risk accounting posting. AI registry blocks direct execution in Phase 6F.',
    blockedReason: 'Final accounting posting must remain in reviewed accounting workflow.',
  },

  reverse_journal_entry: {
    id: 'reverse_journal_entry',
    label: 'Reverse journal entry',
    riskLevel: TOOL_RISK_LEVELS.HIGH_RISK,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'POST /api/journal-entries/:journalEntryId/reverse',
    description: 'High-risk accounting reversal. AI registry blocks direct execution in Phase 6F.',
    blockedReason: 'Journal reversal requires explicit manual workflow and audit review.',
  },

  confirm_bank_import: {
    id: 'confirm_bank_import',
    label: 'Confirm bank statement import',
    riskLevel: TOOL_RISK_LEVELS.HIGH_RISK,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'POST /api/bank-statements/import/confirm',
    description: 'AI must not confirm bank imports directly in Phase 6F.',
    blockedReason: 'Bank import confirmation changes accounting source data.',
  },

  finalize_bank_reconciliation: {
    id: 'finalize_bank_reconciliation',
    label: 'Finalize bank reconciliation',
    riskLevel: TOOL_RISK_LEVELS.HIGH_RISK,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: true,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'POST /api/bank-statements/transactions/:id/reconcile',
    description: 'AI may propose matches but must not finalize reconciliation directly in Phase 6F.',
    blockedReason: 'Reconciliation changes accounting linkage and requires human review.',
  },

  delete_records: {
    id: 'delete_records',
    label: 'Delete accounting or system records',
    riskLevel: TOOL_RISK_LEVELS.FORBIDDEN,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'Any DELETE or destructive endpoint',
    description: 'AI must never delete accounting, company, user, audit, or system records.',
    blockedReason: 'Deletion is outside AI assistant authority.',
  },

  submit_tax_or_elster: {
    id: 'submit_tax_or_elster',
    label: 'Submit tax or ELSTER filing',
    riskLevel: TOOL_RISK_LEVELS.FORBIDDEN,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'ELSTER/tax submit routes disabled',
    description: 'AI must never submit taxes, UStVA, ELSTER, or send data to Finanzamt.',
    blockedReason: 'Tax submission is disabled and out of scope without official integration/legal review.',
  },

  pay_or_move_money: {
    id: 'pay_or_move_money',
    label: 'Pay or move money',
    riskLevel: TOOL_RISK_LEVELS.FORBIDDEN,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'No AI payment execution',
    description: 'AI must never initiate payments, pay VAT, or move funds.',
    blockedReason: 'Payment execution is outside AI assistant authority.',
  },

  direct_datev_upload: {
    id: 'direct_datev_upload',
    label: 'Direct DATEV upload',
    riskLevel: TOOL_RISK_LEVELS.FORBIDDEN,
    executionMode: TOOL_EXECUTION_MODES.BLOCKED,
    approvalRequired: false,
    auditRequired: true,
    allowedRoles: [],
    routeHint: 'No direct DATEV upload',
    description: 'AI must never claim or perform direct DATEV upload/certification.',
    blockedReason: 'Only DATEV-compatible export preparation is allowed.',
  },
});

const getAiTool = (toolId) => AI_TOOL_REGISTRY[toolId] || null;

const listAiTools = () => Object.values(AI_TOOL_REGISTRY);

const listAiToolsByRisk = (riskLevel) =>
  listAiTools().filter((tool) => tool.riskLevel === riskLevel);

const isToolKnown = (toolId) => !!getAiTool(toolId);

const isToolForbidden = (toolId) => {
  const tool = getAiTool(toolId);
  return !tool || tool.riskLevel === TOOL_RISK_LEVELS.FORBIDDEN || tool.executionMode === TOOL_EXECUTION_MODES.BLOCKED;
};

const requiresApproval = (toolId) => {
  const tool = getAiTool(toolId);
  return !!tool?.approvalRequired;
};

const canRoleUseTool = (role, toolId) => {
  const tool = getAiTool(toolId);
  if (!tool || isToolForbidden(toolId)) {
    return false;
  }
  return tool.allowedRoles.includes(role);
};

module.exports = {
  AI_TOOL_REGISTRY,
  TOOL_RISK_LEVELS,
  TOOL_EXECUTION_MODES,
  getAiTool,
  listAiTools,
  listAiToolsByRisk,
  isToolKnown,
  isToolForbidden,
  requiresApproval,
  canRoleUseTool,
};
