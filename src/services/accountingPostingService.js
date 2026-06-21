'use strict';

const { ChartAccount, Expense, JournalEntry, JournalEntryLine, sequelize } = require('../models');
const chartOfAccountsService = require('./chartOfAccountsService');
const AuditLogService = require('./auditLogService');

const MONEY_SCALE = 2;

const normalizeMoney = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    throw new Error('Invalid monetary amount');
  }
  return Number(amount.toFixed(MONEY_SCALE));
};

const assertPositiveMoney = (value, fieldName) => {
  const amount = normalizeMoney(value);
  if (amount < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
  return amount;
};

const validateBalancedEntry = (lines = []) => {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('A journal entry requires at least two lines');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  lines.forEach((line, index) => {
    const debit = assertPositiveMoney(line.debit, `Line ${index + 1} debit`);
    const credit = assertPositiveMoney(line.credit, `Line ${index + 1} credit`);

    if (debit > 0 && credit > 0) {
      throw new Error(`Line ${index + 1} cannot contain both debit and credit`);
    }

    if (debit === 0 && credit === 0) {
      throw new Error(`Line ${index + 1} must contain either debit or credit`);
    }

    if (!line.accountId) {
      throw new Error(`Line ${index + 1} requires an accountId`);
    }

    totalDebit = normalizeMoney(totalDebit + debit);
    totalCredit = normalizeMoney(totalCredit + credit);
  });

  if (totalDebit !== totalCredit) {
    throw new Error(`Journal entry is not balanced: debit ${totalDebit} does not equal credit ${totalCredit}`);
  }

  return {
    balanced: true,
    totalDebit,
    totalCredit,
  };
};

const normalizeJournalLine = ({ line, companyId, journalEntryId }) => ({
  journalEntryId,
  companyId,
  accountId: line.accountId,
  debit: normalizeMoney(line.debit),
  credit: normalizeMoney(line.credit),
  currency: line.currency || 'EUR',
  taxCode: line.taxCode || null,
  vatRate: line.vatRate ?? null,
  counterpartyName: line.counterpartyName || null,
  description: line.description || null,
  metadata: line.metadata || null,
});

const resolveJournalLines = async ({ companyId, lines, transaction }) => {
  const resolvedLines = [];

  for (const line of lines) {
    if (line.accountId) {
      resolvedLines.push(line);
      continue;
    }

    if (!line.accountRole) {
      resolvedLines.push(line);
      continue;
    }

    const account = await chartOfAccountsService.getAccountByRole({
      companyId,
      role: line.accountRole,
      transaction,
    });

    resolvedLines.push({
      ...line,
      accountId: account.id,
      accountCode: account.code,
    });
  }

  return resolvedLines;
};

const hasInputVat = (expense) => {
  const vatAmount = normalizeMoney(expense?.vatAmount);
  const vatRate = Number(expense?.vatRate ?? 0);
  const inputVatAllowed = expense?.inputVatAllowed;

  if (String(expense?.taxTreatment || '').toLowerCase() === 'no_vorsteuer_allowed') {
    return false;
  }

  if (inputVatAllowed === false) {
    return false;
  }

  return vatAmount > 0 || vatRate > 0;
};

const getExpenseGrossAmount = (expense) => {
  const gross = normalizeMoney(expense?.grossAmount ?? expense?.amount);
  if (gross <= 0) {
    throw new Error('Expense gross amount must be greater than zero');
  }
  return gross;
};

const getExpenseNetAmount = (expense) => {
  const net = normalizeMoney(expense?.netAmount);
  if (net <= 0) {
    throw new Error('Expense net amount must be greater than zero');
  }
  return net;
};

const buildExpensePostingLines = (expense) => {
  if (!expense) {
    throw new Error('expense is required');
  }

  const grossAmount = getExpenseGrossAmount(expense);

  if (!hasInputVat(expense)) {
    return [
      {
        accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.GENERAL_EXPENSE,
        debit: grossAmount,
        credit: 0,
        description: expense.description || expense.vendorName || 'Expense without input VAT',
      },
      {
        accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.ACCOUNTS_PAYABLE,
        debit: 0,
        credit: grossAmount,
        description: expense.vendorName || 'Accounts payable',
      },
    ];
  }

  const netAmount = getExpenseNetAmount(expense);
  const vatAmount = normalizeMoney(expense.vatAmount);

  if (vatAmount <= 0) {
    throw new Error('Input VAT expense requires a VAT amount greater than zero');
  }

  return [
    {
      accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.GENERAL_EXPENSE,
      debit: netAmount,
      credit: 0,
      description: expense.description || expense.vendorName || 'Expense net amount',
    },
    {
      accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.INPUT_VAT_19,
      debit: vatAmount,
      credit: 0,
      taxCode: 'input_vat_19',
      vatRate: Number(expense.vatRate ?? 19),
      description: 'Input VAT',
    },
    {
      accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.ACCOUNTS_PAYABLE,
      debit: 0,
      credit: grossAmount,
      description: expense.vendorName || 'Accounts payable',
    },
  ];
};

const ensureAccountsBelongToCompany = async ({ companyId, lines, transaction }) => {
  const accountIds = [...new Set(lines.map((line) => line.accountId))];

  const accounts = await ChartAccount.findAll({
    where: {
      id: accountIds,
      companyId,
      isActive: true,
    },
    transaction,
  });

  if (accounts.length !== accountIds.length) {
    throw new Error('One or more journal accounts are missing, inactive, or outside the active company');
  }

  return accounts;
};


const isExpensePostingPreviewEntry = (entry) => {
  const metadata = entry?.metadata || {};
  return metadata.previewOnly === true && metadata.source === 'expense_posting_preview';
};

const findExistingExpensePostingPreview = async ({ expenseId, companyId, transaction = null } = {}) => {
  if (!expenseId) {
    throw new Error('expenseId is required');
  }

  if (!companyId) {
    throw new Error('companyId is required');
  }

  const candidates = await JournalEntry.findAll({
    where: {
      companyId,
      sourceType: 'expense',
      sourceId: String(expenseId),
      status: 'draft',
    },
    include: [{ model: JournalEntryLine, as: 'lines' }],
    order: [['createdAt', 'ASC']],
    transaction,
  });

  return candidates.find(isExpensePostingPreviewEntry) || null;
};


const appendExpensePostingPreviewAuditLog = async ({
  action,
  expense,
  journalEntry,
  lines = [],
  companyId,
  createdBy = null,
  reusedPreview = false,
}) => {
  await AuditLogService.appendEntry({
    action,
    resourceType: 'JournalEntry',
    resourceId: journalEntry?.id ? String(journalEntry.id) : null,
    userId: createdBy,
    companyId,
    oldValues: null,
    newValues: {
      expenseId: expense?.id || null,
      journalEntryId: journalEntry?.id || null,
      sourceType: journalEntry?.sourceType || 'expense',
      sourceId: journalEntry?.sourceId || (expense?.id ? String(expense.id) : null),
      previewOnly: true,
      reusedPreview,
      linesCount: Array.isArray(lines) ? lines.length : 0,
      expenseStatus: expense?.status || null,
      taxTreatment: expense?.taxTreatment || null,
      inputVatAllowed: expense?.inputVatAllowed ?? null,
    },
    reason: reusedPreview
      ? 'Existing expense posting preview reused'
      : 'Expense posting preview created',
  });
};

const createExpensePostingPreview = async ({ expenseId, companyId, createdBy = null } = {}) => {
  if (!expenseId) {
    throw new Error('expenseId is required');
  }

  if (!companyId) {
    throw new Error('companyId is required');
  }

  const expense = await Expense.findOne({
    where: {
      id: expenseId,
      companyId,
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  const existingPreview = await findExistingExpensePostingPreview({
    expenseId: expense.id,
    companyId,
  });

  if (existingPreview) {
    const existingLines = existingPreview.lines || [];

    await appendExpensePostingPreviewAuditLog({
      action: 'expense_posting_preview_reused',
      expense,
      journalEntry: existingPreview,
      lines: existingLines,
      companyId,
      createdBy,
      reusedPreview: true,
    });

    return {
      journalEntry: existingPreview,
      lines: existingLines,
      previewOnly: true,
      reusedPreview: true,
    };
  }

  const lines = buildExpensePostingLines(expense.get ? expense.get({ plain: true }) : expense);

  const result = await createJournalEntryDraft({
    companyId,
    entryDate: expense.expenseDate || expense.date || new Date(),
    sourceType: 'expense',
    sourceId: String(expense.id),
    description: `Expense posting preview: ${expense.vendorName || expense.description || expense.id}`,
    currency: expense.currency || 'EUR',
    createdBy,
    metadata: {
      previewOnly: true,
      source: 'expense_posting_preview',
      expenseId: expense.id,
      expenseStatus: expense.status || null,
      taxTreatment: expense.taxTreatment || null,
      inputVatAllowed: expense.inputVatAllowed ?? null,
    },
    lines,
  });

  await appendExpensePostingPreviewAuditLog({
    action: 'expense_posting_preview_created',
    expense,
    journalEntry: result.journalEntry,
    lines: result.lines,
    companyId,
    createdBy,
    reusedPreview: false,
  });

  return {
    ...result,
    previewOnly: true,
    reusedPreview: false,
  };
};


const findPostedExpenseJournalEntry = async ({ expenseId, companyId, transaction = null } = {}) => {
  if (!expenseId) {
    throw new Error('expenseId is required');
  }

  if (!companyId) {
    throw new Error('companyId is required');
  }

  return JournalEntry.findOne({
    where: {
      companyId,
      sourceType: 'expense',
      sourceId: String(expenseId),
      status: 'posted',
    },
    include: [{ model: JournalEntryLine, as: 'lines' }],
    order: [['postedAt', 'DESC']],
    transaction,
  });
};

const appendExpensePostingFinalizedAuditLog = async ({
  expense,
  journalEntry,
  lines = [],
  companyId,
  postedBy = null,
}) => {
  await AuditLogService.appendEntry({
    action: 'expense_posting_finalized',
    resourceType: 'JournalEntry',
    resourceId: journalEntry?.id ? String(journalEntry.id) : null,
    userId: postedBy,
    companyId,
    oldValues: {
      status: 'draft',
      previewOnly: true,
    },
    newValues: {
      expenseId: expense?.id || null,
      journalEntryId: journalEntry?.id || null,
      sourceType: journalEntry?.sourceType || 'expense',
      sourceId: journalEntry?.sourceId || (expense?.id ? String(expense.id) : null),
      status: 'posted',
      previewOnly: false,
      finalizedFromPreview: true,
      postedAt: journalEntry?.postedAt || null,
      postedBy,
      linesCount: Array.isArray(lines) ? lines.length : 0,
      expenseStatus: expense?.status || null,
      taxTreatment: expense?.taxTreatment || null,
      inputVatAllowed: expense?.inputVatAllowed ?? null,
    },
    reason: 'Expense posting finalized from reviewed posting preview',
  });
};

const finalizeExpensePosting = async ({ expenseId, companyId, postedBy = null } = {}) => {
  if (!expenseId) {
    throw new Error('expenseId is required');
  }

  if (!companyId) {
    throw new Error('companyId is required');
  }

  const expense = await Expense.findOne({
    where: {
      id: expenseId,
      companyId,
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  const alreadyPosted = await findPostedExpenseJournalEntry({
    expenseId: expense.id,
    companyId,
  });

  if (alreadyPosted) {
    const error = new Error('Expense posting already finalized');
    error.code = 'EXPENSE_POSTING_ALREADY_FINALIZED';
    error.status = 409;
    error.journalEntry = alreadyPosted;
    throw error;
  }

  const preview = await findExistingExpensePostingPreview({
    expenseId: expense.id,
    companyId,
  });

  if (!preview) {
    const error = new Error('Expense posting preview is required before final posting');
    error.code = 'EXPENSE_POSTING_PREVIEW_REQUIRED';
    error.status = 409;
    throw error;
  }

  const postedAt = new Date();
  const currentMetadata = preview.metadata || {};
  const nextMetadata = {
    ...currentMetadata,
    previewOnly: false,
    finalizedFromPreview: true,
    finalizedAt: postedAt.toISOString(),
  };

  const postedEntry = await sequelize.transaction(async (transaction) => {
    const lockedPreview = await JournalEntry.findOne({
      where: {
        id: preview.id,
        companyId,
        status: 'draft',
      },
      include: [{ model: JournalEntryLine, as: 'lines' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedPreview) {
      const error = new Error('Expense posting preview is no longer available for final posting');
      error.code = 'EXPENSE_POSTING_PREVIEW_NOT_AVAILABLE';
      error.status = 409;
      throw error;
    }

    validateBalancedEntry(
      (lockedPreview.lines || []).map((line) => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
      })),
    );

    await lockedPreview.update(
      {
        status: 'posted',
        postedAt,
        postedBy,
        metadata: nextMetadata,
      },
      { transaction },
    );

    return JournalEntry.findByPk(lockedPreview.id, {
      include: [{ model: JournalEntryLine, as: 'lines' }],
      transaction,
    });
  });

  const lines = postedEntry?.lines || [];

  await appendExpensePostingFinalizedAuditLog({
    expense,
    journalEntry: postedEntry,
    lines,
    companyId,
    postedBy,
  });

  return {
    journalEntry: postedEntry,
    lines,
    posted: true,
    finalizedFromPreview: true,
  };
};

const createJournalEntryDraft = async ({
  companyId,
  entryDate,
  sourceType,
  sourceId = null,
  description = null,
  currency = 'EUR',
  createdBy = null,
  metadata = null,
  lines = [],
} = {}) => {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  if (!entryDate) {
    throw new Error('entryDate is required');
  }

  if (!sourceType) {
    throw new Error('sourceType is required');
  }

  return sequelize.transaction(async (transaction) => {
    const resolvedLines = await resolveJournalLines({ companyId, lines, transaction });

    validateBalancedEntry(resolvedLines);

    await ensureAccountsBelongToCompany({ companyId, lines: resolvedLines, transaction });

    const journalEntry = await JournalEntry.create(
      {
        companyId,
        entryDate,
        sourceType,
        sourceId: sourceId ? String(sourceId) : null,
        status: 'draft',
        description,
        currency,
        createdBy,
        metadata,
      },
      { transaction },
    );

    const journalLines = await JournalEntryLine.bulkCreate(
      resolvedLines.map((line) =>
        normalizeJournalLine({
          line,
          companyId,
          journalEntryId: journalEntry.id,
        }),
      ),
      { transaction },
    );

    const reloadedEntry = await JournalEntry.findByPk(journalEntry.id, {
      include: [{ model: JournalEntryLine, as: 'lines' }],
      transaction,
    });

    return {
      journalEntry: reloadedEntry || journalEntry,
      lines: journalLines,
    };
  });
};

module.exports = {
  normalizeMoney,
  validateBalancedEntry,
  createJournalEntryDraft,
  resolveJournalLines,
  buildExpensePostingLines,
  findExistingExpensePostingPreview,
  findPostedExpenseJournalEntry,
  createExpensePostingPreview,
  finalizeExpensePosting,
};
