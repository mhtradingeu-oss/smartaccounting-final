'use strict';

const { ChartAccount, JournalEntry, JournalEntryLine, sequelize } = require('../models');
const chartOfAccountsService = require('./chartOfAccountsService');

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
};
