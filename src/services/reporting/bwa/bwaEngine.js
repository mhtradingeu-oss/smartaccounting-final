'use strict';

const {
  ROW_TYPES,
} = require('./bwaDefinitions');

const WARNING_CODES = Object.freeze({
  UNMAPPED_REVENUE_ACCOUNT:
    'UNMAPPED_REVENUE_ACCOUNT',
  UNMAPPED_EXPENSE_ACCOUNT:
    'UNMAPPED_EXPENSE_ACCOUNT',
});

const ERROR_CODES = Object.freeze({
  INVALID_DEFINITION: 'BWA_INVALID_DEFINITION',
  DUPLICATE_ROW_ID: 'BWA_DUPLICATE_ROW_ID',
  UNKNOWN_ROW_TYPE: 'BWA_UNKNOWN_ROW_TYPE',
  MISSING_FORMULA_REFERENCE:
    'BWA_MISSING_FORMULA_REFERENCE',
  FORMULA_CYCLE: 'BWA_FORMULA_CYCLE',
  BWA_FORWARD_FORMULA_REFERENCE:
    'BWA_FORWARD_FORMULA_REFERENCE',
  BWA_INVALID_FORMULA_FACTOR:
    'BWA_INVALID_FORMULA_FACTOR',
  BWA_AMBIGUOUS_ACCOUNT_MAPPING:
    'BWA_AMBIGUOUS_ACCOUNT_MAPPING',
});

const roundMoney = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100,
  ) / 100;

const cloneObject = (value) =>
  value === undefined
    ? undefined
    : JSON.parse(JSON.stringify(value));

function createEngineError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeAccountCode(value) {
  return String(value || '').trim();
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function validateDefinition(definition) {
  if (
    !definition ||
    typeof definition !== 'object' ||
    !Array.isArray(definition.rows)
  ) {
    throw createEngineError(
      ERROR_CODES.INVALID_DEFINITION,
      'BWA definition must contain a rows array.',
    );
  }

  const rowIds = new Set();
  const rowIndexes = new Map();

  for (const [index, row] of definition.rows.entries()) {
    if (!row?.id) {
      throw createEngineError(
        ERROR_CODES.INVALID_DEFINITION,
        'Every BWA row requires an id.',
      );
    }

    if (rowIds.has(row.id)) {
      throw createEngineError(
        ERROR_CODES.DUPLICATE_ROW_ID,
        `Duplicate BWA row id: ${row.id}`,
      );
    }

    rowIds.add(row.id);
    rowIndexes.set(row.id, index);

    if (
      row.type !== ROW_TYPES.ACCOUNT_SUM &&
      row.type !== ROW_TYPES.FORMULA
    ) {
      throw createEngineError(
        ERROR_CODES.UNKNOWN_ROW_TYPE,
        `Unknown BWA row type for ${row.id}.`,
      );
    }
  }

  for (const row of definition.rows) {
    if (row.type !== ROW_TYPES.FORMULA) {
      continue;
    }

    if (!Array.isArray(row.formula)) {
      throw createEngineError(
        ERROR_CODES.INVALID_DEFINITION,
        `Formula row ${row.id} requires a formula array.`,
      );
    }

    for (const term of row.formula) {
      if (!rowIds.has(term?.rowId)) {
        throw createEngineError(
          ERROR_CODES.MISSING_FORMULA_REFERENCE,
          `Formula row ${row.id} references missing row ${term?.rowId}.`,
        );
      }

      if (
        typeof term.factor !== 'number' ||
        !Number.isFinite(term.factor)
      ) {
        throw createEngineError(
          ERROR_CODES.BWA_INVALID_FORMULA_FACTOR,
          `Formula row ${row.id} has an invalid factor for referenced row ${term.rowId}.`,
        );
      }
    }
  }

  detectFormulaCycles(definition);

  for (const row of definition.rows) {
    if (row.type !== ROW_TYPES.FORMULA) {
      continue;
    }

    for (const term of row.formula) {
      if (rowIndexes.get(term.rowId) > rowIndexes.get(row.id)) {
        throw createEngineError(
          ERROR_CODES.BWA_FORWARD_FORMULA_REFERENCE,
          `Formula row ${row.id} references later row ${term.rowId}.`,
        );
      }
    }
  }

  return true;
}

function detectFormulaCycles(definition) {
  const formulaRows = new Map(
    definition.rows
      .filter((row) => row.type === ROW_TYPES.FORMULA)
      .map((row) => [row.id, row]),
  );

  const visiting = new Set();
  const visited = new Set();

  function visit(rowId) {
    if (visiting.has(rowId)) {
      throw createEngineError(
        ERROR_CODES.FORMULA_CYCLE,
        `Circular BWA formula dependency detected at ${rowId}.`,
      );
    }

    if (visited.has(rowId)) {
      return;
    }

    const row = formulaRows.get(rowId);

    if (!row) {
      visited.add(rowId);
      return;
    }

    visiting.add(rowId);

    for (const term of row.formula || []) {
      if (formulaRows.has(term.rowId)) {
        visit(term.rowId);
      }
    }

    visiting.delete(rowId);
    visited.add(rowId);
  }

  for (const rowId of formulaRows.keys()) {
    visit(rowId);
  }
}

function matchesRange(accountCode, range) {
  if (!Array.isArray(range) || range.length !== 2) {
    return false;
  }

  const normalizedCode = normalizeAccountCode(accountCode);
  const start = normalizeAccountCode(range[0]);
  const end = normalizeAccountCode(range[1]);

  if (!normalizedCode || !start || !end) {
    return false;
  }

  return normalizedCode >= start && normalizedCode <= end;
}

function matcherMatchesAccount(matcher, account) {
  const accountCode = normalizeAccountCode(
    account.accountCode,
  );
  const accountRole = normalizeRole(account.role);

  const roleMatch =
    Array.isArray(matcher.roles) &&
    matcher.roles
      .map(normalizeRole)
      .includes(accountRole);

  const codeMatch =
    Array.isArray(matcher.accountCodes) &&
    matcher.accountCodes
      .map(normalizeAccountCode)
      .includes(accountCode);

  const rangeMatch =
    Array.isArray(matcher.accountRanges) &&
    matcher.accountRanges.some((range) =>
      matchesRange(accountCode, range),
    );

  return roleMatch || codeMatch || rangeMatch;
}

function rowMatchesAccount(row, account) {
  return (
    row.type === ROW_TYPES.ACCOUNT_SUM &&
    Array.isArray(row.matchers) &&
    row.matchers.some((matcher) =>
      matcherMatchesAccount(matcher, account),
    )
  );
}

function validateAccountMappings(definition, accounts) {
  const accountRows = definition.rows.filter(
    (row) => row.type === ROW_TYPES.ACCOUNT_SUM,
  );

  for (const account of accounts) {
    const matchingRowIds = accountRows
      .filter((row) => rowMatchesAccount(row, account))
      .map((row) => row.id);

    if (matchingRowIds.length > 1) {
      throw createEngineError(
        ERROR_CODES.BWA_AMBIGUOUS_ACCOUNT_MAPPING,
        `Account ${account.accountId} (${account.accountCode}) matches multiple BWA rows: ${matchingRowIds.join(', ')}.`,
      );
    }
  }
}

function collectMonths(accounts) {
  return Array.from(
    accounts.reduce((months, account) => {
      for (
        const month of Object.keys(
          account.monthlyValues || {},
        )
      ) {
        months.add(month);
      }

      return months;
    }, new Set()),
  ).sort();
}

function createZeroMonthValues(months) {
  return Object.fromEntries(
    months.map((month) => [month, 0]),
  );
}

function aggregateAccountRow(row, accounts, months) {
  const matchedAccounts = accounts.filter((account) =>
    rowMatchesAccount(row, account),
  );

  const monthlyValues = createZeroMonthValues(months);

  for (const account of matchedAccounts) {
    for (const month of months) {
      monthlyValues[month] += Number(
        account.monthlyValues?.[month] || 0,
      );
    }
  }

  const ytdValue = matchedAccounts.reduce(
    (total, account) =>
      total + Number(account.ytdValue || 0),
    0,
  );

  return {
    rowId: row.id,
    label: row.label,
    rowType: row.type,
    monthlyValues: Object.fromEntries(
      months.map((month) => [
        month,
        roundMoney(monthlyValues[month]),
      ]),
    ),
    ytdValue: roundMoney(ytdValue),
    accountIds: matchedAccounts.map(
      (account) => account.accountId,
    ),
    accountCodes: matchedAccounts.map(
      (account) => account.accountCode,
    ),
    accountCount: matchedAccounts.length,
  };
}

function evaluateFormulaRow(row, rowMap, months) {
  const monthlyValues = createZeroMonthValues(months);
  let ytdValue = 0;

  for (const term of row.formula) {
    const sourceRow = rowMap.get(term.rowId);
    const factor = Number(term.factor);

    for (const month of months) {
      monthlyValues[month] +=
        Number(sourceRow.monthlyValues[month] || 0) *
        factor;
    }

    ytdValue += Number(sourceRow.ytdValue || 0) * factor;
  }

  return {
    rowId: row.id,
    label: row.label,
    rowType: row.type,
    monthlyValues: Object.fromEntries(
      months.map((month) => [
        month,
        roundMoney(monthlyValues[month]),
      ]),
    ),
    ytdValue: roundMoney(ytdValue),
    accountIds: [],
    accountCodes: [],
    accountCount: 0,
  };
}

function findUnmappedAccounts(definition, accounts) {
  const mappedAccountIds = new Set();

  for (const row of definition.rows) {
    if (row.type !== ROW_TYPES.ACCOUNT_SUM) {
      continue;
    }

    for (const account of accounts) {
      if (rowMatchesAccount(row, account)) {
        mappedAccountIds.add(account.accountId);
      }
    }
  }

  return accounts.filter(
    (account) =>
      ['revenue', 'expense'].includes(
        account.accountType,
      ) &&
      !mappedAccountIds.has(account.accountId),
  );
}

function buildWarnings(unmappedAccounts) {
  return unmappedAccounts.map((account) => ({
    code:
      account.accountType === 'revenue'
        ? WARNING_CODES.UNMAPPED_REVENUE_ACCOUNT
        : WARNING_CODES.UNMAPPED_EXPENSE_ACCOUNT,
    accountId: account.accountId,
    accountCode: account.accountCode,
    accountName: account.accountName,
    accountType: account.accountType,
  }));
}

function buildBwaReport({
  definition,
  accounts = [],
  months = null,
}) {
  validateDefinition(definition);

  const safeAccounts = cloneObject(accounts) || [];
  validateAccountMappings(definition, safeAccounts);

  const resolvedMonths = Array.isArray(months)
    ? [...months]
    : collectMonths(safeAccounts);

  const rowMap = new Map();
  const rows = [];

  for (const row of definition.rows) {
    if (row.type === ROW_TYPES.ACCOUNT_SUM) {
      const result = aggregateAccountRow(
        row,
        safeAccounts,
        resolvedMonths,
      );

      rowMap.set(row.id, result);
      rows.push(result);
      continue;
    }

    const result = evaluateFormulaRow(
      row,
      rowMap,
      resolvedMonths,
    );

    rowMap.set(row.id, result);
    rows.push(result);
  }

  const unmappedAccounts = findUnmappedAccounts(
    definition,
    safeAccounts,
  );

  return {
    definition: {
      id: definition.id,
      version: definition.version,
      jurisdiction: definition.jurisdiction,
      chartSystem: definition.chartSystem,
      fiscalYearMode: definition.fiscalYearMode,
      title: definition.title,
    },
    preliminary: definition.preliminary === true,
    months: resolvedMonths,
    rows,
    unmappedAccounts,
    warnings: buildWarnings(unmappedAccounts),
  };
}

module.exports = {
  WARNING_CODES,
  ERROR_CODES,
  roundMoney,
  validateDefinition,
  matchesRange,
  matcherMatchesAccount,
  buildBwaReport,
};
