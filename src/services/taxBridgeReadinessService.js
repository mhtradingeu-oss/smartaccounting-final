const { Op } = require('sequelize');
const {
  Invoice,
  Expense,
  FileAttachment,
  TaxReport,
  AuditLog,
  JournalEntry,
  ChartAccount,
} = require('../models');

const roundScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDateWhere = (field, from, to) => {
  const range = {};

  if (from) {
    range[Op.gte] = from;
  }

  if (to) {
    range[Op.lte] = to;
  }

  if (!Object.keys(range).length) {
    return {};
  }

  return { [field]: range };
};

const countRows = async (model, where) => model.count({ where });

const buildIssue = ({ severity, code, message, evidence = {}, action }) => ({
  severity,
  code,
  message,
  evidence,
  action,
});

async function getTaxBridgeReadiness({ companyId, from, to }) {
  const periodFrom = parseDate(from);
  const periodTo = parseDate(to);

  const invoiceDateWhere = buildDateWhere('date', periodFrom, periodTo);
  const expenseDateWhere = buildDateWhere('expenseDate', periodFrom, periodTo);
  const journalDateWhere = buildDateWhere('entryDate', periodFrom, periodTo);

  const [
    totalInvoices,
    finalizedInvoices,
    draftInvoices,
    totalExpenses,
    postedJournalEntries,
    draftJournalEntries,
    taxAccounts,
    datevExports,
    taxReports,
    invoiceAttachments,
    expenseAttachments,
  ] = await Promise.all([
    countRows(Invoice, { companyId, ...invoiceDateWhere }),
    countRows(Invoice, {
      companyId,
      status: { [Op.in]: ['SENT', 'PAID', 'OVERDUE', 'PARTIALLY_PAID'] },
      ...invoiceDateWhere,
    }),
    countRows(Invoice, {
      companyId,
      status: 'DRAFT',
      ...invoiceDateWhere,
    }),
    countRows(Expense, { companyId, ...expenseDateWhere }),
    countRows(JournalEntry, {
      companyId,
      status: 'posted',
      ...journalDateWhere,
    }),
    countRows(JournalEntry, {
      companyId,
      status: { [Op.ne]: 'posted' },
      ...journalDateWhere,
    }),
    countRows(ChartAccount, {
      companyId,
      taxCategory: { [Op.in]: ['input_vat', 'output_vat'] },
    }),
    countRows(AuditLog, {
      action: 'EXPORT_DATEV',
      'context.companyId': companyId,
    }).catch(() => 0),
    countRows(TaxReport, { companyId }).catch(() => 0),
    countRows(FileAttachment, {
      companyId,
      documentType: 'invoice',
    }).catch(() => 0),
    countRows(FileAttachment, {
      companyId,
      documentType: 'expense',
    }).catch(() => 0),
  ]);

  const issues = [];
  const warnings = [];
  const nextActions = [];

  if (!postedJournalEntries) {
    issues.push(
      buildIssue({
        severity: 'critical',
        code: 'NO_POSTED_LEDGER',
        message: 'No posted journal entries found for the selected period.',
        evidence: { postedJournalEntries },
        action: 'Post accounting entries before relying on tax or export readiness.',
      }),
    );
  }

  if (!taxAccounts) {
    issues.push(
      buildIssue({
        severity: 'critical',
        code: 'NO_VAT_ACCOUNTS',
        message: 'No input/output VAT chart accounts were found.',
        evidence: { taxAccounts },
        action: 'Create or seed VAT chart accounts before preparing VAT summaries.',
      }),
    );
  }

  if (draftInvoices > 0) {
    warnings.push(
      buildIssue({
        severity: 'warning',
        code: 'DRAFT_INVOICES_EXIST',
        message: 'Draft invoices exist and will not be included in DATEV export preparation.',
        evidence: { draftInvoices },
        action: 'Review, finalize, or exclude draft invoices before export.',
      }),
    );
  }

  if (draftJournalEntries > 0) {
    warnings.push(
      buildIssue({
        severity: 'warning',
        code: 'UNPOSTED_JOURNAL_ENTRIES_EXIST',
        message: 'Unposted journal entries exist and are not audit-ready.',
        evidence: { draftJournalEntries },
        action: 'Post or remove draft journal entries before review.',
      }),
    );
  }

  if (totalInvoices > 0 && invoiceAttachments === 0) {
    warnings.push(
      buildIssue({
        severity: 'warning',
        code: 'NO_INVOICE_ATTACHMENTS',
        message: 'Invoices exist but no invoice attachments were found.',
        evidence: { totalInvoices, invoiceAttachments },
        action: 'Attach source documents to improve GoBD evidence readiness.',
      }),
    );
  }

  if (totalExpenses > 0 && expenseAttachments === 0) {
    warnings.push(
      buildIssue({
        severity: 'warning',
        code: 'NO_EXPENSE_ATTACHMENTS',
        message: 'Expenses exist but no expense attachments were found.',
        evidence: { totalExpenses, expenseAttachments },
        action: 'Attach receipts or supplier documents before Steuerberater review.',
      }),
    );
  }

  const ledgerScore = postedJournalEntries > 0 ? 35 : 0;
  const vatScore = taxAccounts >= 2 ? 20 : taxAccounts > 0 ? 10 : 0;
  const invoiceScore = totalInvoices === 0 ? 10 : finalizedInvoices > 0 ? 15 : 5;
  const evidenceScore =
    totalInvoices + totalExpenses === 0
      ? 10
      : invoiceAttachments + expenseAttachments > 0
        ? 15
        : 5;
  const exportScore = datevExports > 0 ? 10 : 5;
  const penalty = issues.length * 20 + warnings.length * 5;

  const overallScore = roundScore(
    ledgerScore + vatScore + invoiceScore + evidenceScore + exportScore - penalty,
  );

  const datevReadiness = roundScore(
    (finalizedInvoices > 0 ? 30 : 10) +
      (postedJournalEntries > 0 ? 30 : 0) +
      (datevExports > 0 ? 20 : 10) +
      (invoiceAttachments + expenseAttachments > 0 ? 20 : 10) -
      warnings.length * 4,
  );

  const elsterPreparationReadiness = roundScore(
    (postedJournalEntries > 0 ? 35 : 0) +
      (taxAccounts >= 2 ? 35 : 10) +
      (taxReports > 0 ? 15 : 5) +
      (draftJournalEntries === 0 ? 15 : 5) -
      issues.length * 10,
  );

  const gobdEvidenceReadiness = roundScore(
    (postedJournalEntries > 0 ? 35 : 0) +
      (invoiceAttachments + expenseAttachments > 0 ? 35 : 10) +
      (datevExports > 0 ? 15 : 5) +
      (draftJournalEntries === 0 ? 15 : 5) -
      warnings.length * 5,
  );

  if (overallScore < 80) {
    nextActions.push('Review readiness issues before sending files to a Steuerberater.');
  }

  if (datevExports === 0) {
    nextActions.push('Generate a DATEV-compatible export package after resolving critical issues.');
  }

  if (taxReports === 0) {
    nextActions.push('Prepare VAT/UStVA data for review; SmartAccounting does not submit tax filings.');
  }

  if (invoiceAttachments + expenseAttachments === 0) {
    nextActions.push('Attach receipts and source documents to improve GoBD evidence readiness.');
  }

  return {
    success: true,
    product: 'SmartAccounting Tax Bridge',
    mode: 'preparation_only',
    period: {
      from: periodFrom ? periodFrom.toISOString() : null,
      to: periodTo ? periodTo.toISOString() : null,
    },
    scores: {
      overall: overallScore,
      datevReadiness,
      elsterPreparationReadiness,
      gobdEvidenceReadiness,
    },
    metrics: {
      totalInvoices,
      finalizedInvoices,
      draftInvoices,
      totalExpenses,
      postedJournalEntries,
      draftJournalEntries,
      taxAccounts,
      datevExports,
      taxReports,
      invoiceAttachments,
      expenseAttachments,
    },
    issues,
    warnings,
    nextActions,
    sourceBoundaries: [
      'Read-only readiness check.',
      'No DATEV API upload is performed.',
      'No ELSTER submission is performed.',
      'Tax filing and payment decisions must be reviewed by the user and/or qualified Steuerberater.',
    ],
  };
}

module.exports = {
  getTaxBridgeReadiness,
};
