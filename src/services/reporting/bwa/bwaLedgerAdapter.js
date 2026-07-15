'use strict';

const { Op } = require('sequelize');

const ERROR_CODES = Object.freeze({
  COMPANY_REQUIRED: 'BWA_ADAPTER_COMPANY_REQUIRED',
  INVALID_YEAR: 'BWA_ADAPTER_INVALID_YEAR',
  INVALID_MONTH: 'BWA_ADAPTER_INVALID_MONTH',
  INVALID_MONEY: 'BWA_ADAPTER_INVALID_MONEY',
  INVALID_ACCOUNT: 'BWA_ADAPTER_INVALID_ACCOUNT',
  INVALID_ENTRY_DATE: 'BWA_ADAPTER_INVALID_ENTRY_DATE',
});

function createAdapterError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toNumber(value, fieldName = 'amount') {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw createAdapterError(
      ERROR_CODES.INVALID_MONEY,
      `${fieldName} must be a finite monetary value.`,
    );
  }

  return number;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function validatePeriod({ companyId, year, toMonth }) {
  if (!companyId) {
    throw createAdapterError(
      ERROR_CODES.COMPANY_REQUIRED,
      'companyId is required for BWA ledger adapter.',
    );
  }

  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw createAdapterError(
      ERROR_CODES.INVALID_YEAR,
      'year must be a four-digit integer.',
    );
  }

  if (
    !Number.isInteger(toMonth) ||
    toMonth < 1 ||
    toMonth > 12
  ) {
    throw createAdapterError(
      ERROR_CODES.INVALID_MONTH,
      'toMonth must be an integer from 1 through 12.',
    );
  }
}

function buildCalendarPeriod({ year, toMonth }) {
  const from = `${year}-01-01`;

  const lastDay = new Date(
    Date.UTC(year, toMonth, 0),
  )
    .toISOString()
    .slice(0, 10);

  return {
    year,
    fromMonth: 1,
    toMonth,
    from,
    to: lastDay,
    months: Array.from(
      { length: toMonth },
      (_, index) => `${year}-${pad2(index + 1)}`,
    ),
  };
}

function toPlain(value) {
  if (!value) {
    return value;
  }

  if (typeof value.get === 'function') {
    return value.get({ plain: true });
  }

  if (typeof value.toJSON === 'function') {
    return value.toJSON();
  }

  return value;
}

function getAccountRole(account) {
  const plain = toPlain(account) || {};
  const metadata = plain.metadata || {};

  return metadata.role
    ? String(metadata.role).trim().toLowerCase()
    : null;
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getMonthKey(entryDate) {
  const value = String(entryDate || '');

  if (!isValidDateOnly(value)) {
    return null;
  }

  return value.slice(0, 7);
}

function normalizeProfitAndLossAmount({
  accountType,
  debit,
  credit,
}) {
  const normalizedDebit = toNumber(
    debit,
    'debit',
  );
  const normalizedCredit = toNumber(
    credit,
    'credit',
  );

  if (accountType === 'revenue') {
    return normalizedCredit - normalizedDebit;
  }

  if (accountType === 'expense') {
    return normalizedDebit - normalizedCredit;
  }

  return null;
}

function buildBwaAccountsFromEntries({
  entries = [],
  period,
}) {
  const accountMap = new Map();
  const evidence = [];

  for (const rawEntry of entries) {
    const entry = toPlain(rawEntry) || {};
    const month = getMonthKey(entry.entryDate);

    if (!month) {
      throw createAdapterError(
        ERROR_CODES.INVALID_ENTRY_DATE,
        `Journal entry ${entry.id || 'unknown'} has an invalid entryDate.`,
      );
    }

    if (!period.months.includes(month)) {
      continue;
    }

    for (const rawLine of entry.lines || []) {
      const line = toPlain(rawLine) || {};
      const account = toPlain(line.account) || {};

      if (!['revenue', 'expense'].includes(account.type)) {
        continue;
      }

      const amount = normalizeProfitAndLossAmount({
        accountType: account.type,
        debit: line.debit,
        credit: line.credit,
      });

      const accountId = account.id;
      const accountCode = account.code;

      if (!accountId || !accountCode) {
        throw createAdapterError(
          ERROR_CODES.INVALID_ACCOUNT,
          `Profit-and-loss journal line ${line.id || 'unknown'} requires an account id and account code.`,
        );
      }

      if (!accountMap.has(accountId)) {
        accountMap.set(accountId, {
          accountId,
          accountCode: String(accountCode),
          accountName: account.name || null,
          accountType: account.type,
          role: getAccountRole(account),
          monthlyValues: Object.fromEntries(
            period.months.map((monthKey) => [
              monthKey,
              0,
            ]),
          ),
          ytdValue: 0,
        });
      }

      const normalizedAccount = accountMap.get(accountId);

      normalizedAccount.monthlyValues[month] += amount;
      normalizedAccount.ytdValue += amount;

      evidence.push({
        accountId,
        accountCode: String(accountCode),
        month,
        amount,
        journalEntryId: entry.id || null,
        journalEntryLineId: line.id || null,
        entryDate: entry.entryDate || null,
        sourceType: entry.sourceType || null,
        sourceId: entry.sourceId || null,
        description:
          line.description ||
          entry.description ||
          null,
        debit: toNumber(
          line.debit,
          'debit',
        ),
        credit: toNumber(
          line.credit,
          'credit',
        ),
      });
    }
  }

  const accounts = Array.from(accountMap.values())
    .sort((left, right) =>
      String(left.accountCode).localeCompare(
        String(right.accountCode),
      ),
    );

  evidence.sort((left, right) => {
    const dateComparison = String(left.entryDate).localeCompare(
      String(right.entryDate),
    );

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return String(left.journalEntryLineId).localeCompare(
      String(right.journalEntryLineId),
    );
  });

  return {
    period,
    accounts,
    evidence,
  };
}

async function loadPostedLedgerForBwa({
  companyId,
  year,
  toMonth,
  models = null,
}) {
  validatePeriod({
    companyId,
    year,
    toMonth,
  });

  const period = buildCalendarPeriod({
    year,
    toMonth,
  });

  const databaseModels =
    models || require('../../../models');

  const {
    JournalEntry,
    JournalEntryLine,
    ChartAccount,
  } = databaseModels;

  const entries = await JournalEntry.findAll({
    where: {
      companyId,
      status: 'posted',
      entryDate: {
        [Op.gte]: period.from,
        [Op.lte]: period.to,
      },
    },
    include: [
      {
        model: JournalEntryLine,
        as: 'lines',
        required: true,
        include: [
          {
            model: ChartAccount,
            as: 'account',
            required: true,
            attributes: [
              'id',
              'code',
              'name',
              'type',
              'normalBalance',
              'taxCategory',
              'metadata',
            ],
          },
        ],
      },
    ],
    order: [
      ['entryDate', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  return buildBwaAccountsFromEntries({
    entries,
    period,
  });
}

module.exports = {
  ERROR_CODES,
  validatePeriod,
  buildCalendarPeriod,
  isValidDateOnly,
  getMonthKey,
  normalizeProfitAndLossAmount,
  buildBwaAccountsFromEntries,
  loadPostedLedgerForBwa,
};
