const { Op } = require('sequelize');
const { JournalEntry, JournalEntryLine, ChartAccount } = require('../models');

const toNumber = (value) => Number.parseFloat(value || 0);

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const buildPostedJournalEntryWhere = ({ companyId, from, to }) => {
  const where = {
    companyId,
    status: 'posted',
  };

  if (from || to) {
    where.entryDate = {};

    if (from) {
      where.entryDate[Op.gte] = String(from);
    }

    if (to) {
      where.entryDate[Op.lte] = String(to);
    }
  }

  return where;
};

async function getTrialBalance({ companyId, from = null, to = null }) {
  const journalEntries = await JournalEntry.findAll({
    where: buildPostedJournalEntryWhere({ companyId, from, to }),
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
            attributes: ['id', 'code', 'name', 'type', 'normalBalance'],
          },
        ],
      },
    ],
    order: [
      ['entryDate', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  const accountMap = new Map();

  for (const entry of journalEntries) {
    for (const line of entry.lines || []) {
      const account = line.account;
      if (!account) {
        continue;
      }

      const key = account.id;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          normalBalance: account.normalBalance,
          debitTotal: 0,
          creditTotal: 0,
          balance: 0,
        });
      }

      const row = accountMap.get(key);
      row.debitTotal += toNumber(line.debit);
      row.creditTotal += toNumber(line.credit);
    }
  }

  const rows = Array.from(accountMap.values())
    .map((row) => {
      const rawBalance =
        row.normalBalance === 'credit'
          ? row.creditTotal - row.debitTotal
          : row.debitTotal - row.creditTotal;

      return {
        ...row,
        debitTotal: roundMoney(row.debitTotal),
        creditTotal: roundMoney(row.creditTotal),
        balance: roundMoney(rawBalance),
      };
    })
    .sort((a, b) => String(a.accountCode).localeCompare(String(b.accountCode)));

  const totalDebits = roundMoney(rows.reduce((sum, row) => sum + row.debitTotal, 0));
  const totalCredits = roundMoney(rows.reduce((sum, row) => sum + row.creditTotal, 0));

  return {
    companyId,
    filters: {
      from,
      to,
      status: 'posted',
    },
    rows,
    totals: {
      totalDebits,
      totalCredits,
      difference: roundMoney(totalDebits - totalCredits),
      isBalanced: roundMoney(totalDebits - totalCredits) === 0,
    },
  };
}

async function getProfitAndLoss({ companyId, from = null, to = null }) {
  const journalEntries = await JournalEntry.findAll({
    where: buildPostedJournalEntryWhere({ companyId, from, to }),
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
            attributes: ['id', 'code', 'name', 'type', 'normalBalance'],
          },
        ],
      },
    ],
    order: [
      ['entryDate', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  const groups = {
    revenue: new Map(),
    expenses: new Map(),
  };

  for (const entry of journalEntries) {
    for (const line of entry.lines || []) {
      const account = line.account;
      if (!account || !['revenue', 'expense'].includes(account.type)) {
        continue;
      }

      const groupName = account.type === 'revenue' ? 'revenue' : 'expenses';
      const group = groups[groupName];

      if (!group.has(account.id)) {
        group.set(account.id, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          normalBalance: account.normalBalance,
          debitTotal: 0,
          creditTotal: 0,
          balance: 0,
        });
      }

      const row = group.get(account.id);
      row.debitTotal += toNumber(line.debit);
      row.creditTotal += toNumber(line.credit);
    }
  }

  const normalizeRows = (rows, balanceDirection) =>
    Array.from(rows.values())
      .map((row) => {
        const rawBalance =
          balanceDirection === 'credit'
            ? row.creditTotal - row.debitTotal
            : row.debitTotal - row.creditTotal;

        return {
          ...row,
          debitTotal: roundMoney(row.debitTotal),
          creditTotal: roundMoney(row.creditTotal),
          balance: roundMoney(rawBalance),
        };
      })
      .sort((a, b) => String(a.accountCode).localeCompare(String(b.accountCode)));

  const revenueRows = normalizeRows(groups.revenue, 'credit');
  const expenseRows = normalizeRows(groups.expenses, 'debit');

  const totalRevenue = roundMoney(revenueRows.reduce((sum, row) => sum + row.balance, 0));
  const totalExpenses = roundMoney(expenseRows.reduce((sum, row) => sum + row.balance, 0));
  const netProfit = roundMoney(totalRevenue - totalExpenses);

  return {
    companyId,
    filters: {
      from,
      to,
      status: 'posted',
    },
    revenue: {
      rows: revenueRows,
      total: totalRevenue,
    },
    expenses: {
      rows: expenseRows,
      total: totalExpenses,
    },
    totals: {
      totalRevenue,
      totalExpenses,
      netProfit,
      isProfit: netProfit >= 0,
    },
  };
}

async function getBalanceSheet({ companyId, asOf = null }) {
  const journalEntries = await JournalEntry.findAll({
    where: buildPostedJournalEntryWhere({
      companyId,
      from: null,
      to: asOf,
    }),
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
            attributes: ['id', 'code', 'name', 'type', 'normalBalance'],
          },
        ],
      },
    ],
    order: [
      ['entryDate', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  const groups = {
    assets: new Map(),
    liabilities: new Map(),
    equity: new Map(),
  };

  const groupByType = {
    asset: 'assets',
    liability: 'liabilities',
    equity: 'equity',
  };

  for (const entry of journalEntries) {
    for (const line of entry.lines || []) {
      const account = line.account;
      const groupName = account ? groupByType[account.type] : null;

      if (!groupName) {
        continue;
      }

      const group = groups[groupName];

      if (!group.has(account.id)) {
        group.set(account.id, {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          normalBalance: account.normalBalance,
          debitTotal: 0,
          creditTotal: 0,
          balance: 0,
        });
      }

      const row = group.get(account.id);
      row.debitTotal += toNumber(line.debit);
      row.creditTotal += toNumber(line.credit);
    }
  }

  const normalizeRows = (rows, balanceDirection) =>
    Array.from(rows.values())
      .map((row) => {
        const rawBalance =
          balanceDirection === 'credit'
            ? row.creditTotal - row.debitTotal
            : row.debitTotal - row.creditTotal;

        return {
          ...row,
          debitTotal: roundMoney(row.debitTotal),
          creditTotal: roundMoney(row.creditTotal),
          balance: roundMoney(rawBalance),
        };
      })
      .sort((a, b) => String(a.accountCode).localeCompare(String(b.accountCode)));

  const assetRows = normalizeRows(groups.assets, 'debit');
  const liabilityRows = normalizeRows(groups.liabilities, 'credit');
  const equityRows = normalizeRows(groups.equity, 'credit');

  const totalAssets = roundMoney(assetRows.reduce((sum, row) => sum + row.balance, 0));
  const totalLiabilities = roundMoney(liabilityRows.reduce((sum, row) => sum + row.balance, 0));
  const totalEquity = roundMoney(equityRows.reduce((sum, row) => sum + row.balance, 0));
  const accountingEquationDifference = roundMoney(totalAssets - (totalLiabilities + totalEquity));

  return {
    companyId,
    filters: {
      asOf,
      status: 'posted',
    },
    assets: {
      rows: assetRows,
      total: totalAssets,
    },
    liabilities: {
      rows: liabilityRows,
      total: totalLiabilities,
    },
    equity: {
      rows: equityRows,
      total: totalEquity,
    },
    totals: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      liabilitiesAndEquity: roundMoney(totalLiabilities + totalEquity),
      accountingEquationDifference,
      isBalanced: accountingEquationDifference === 0,
    },
  };
}

const buildGeneralLedgerEntryWhere = ({ companyId, from, to, sourceType, beforeDate = null }) => {
  const where = {
    companyId,
    status: 'posted',
  };

  if (beforeDate) {
    where.entryDate = { [Op.lt]: String(beforeDate) };

    if (sourceType) {
      where.sourceType = String(sourceType);
    }

    return where;
  }

  if (from || to) {
    where.entryDate = {};

    if (from) {
      where.entryDate[Op.gte] = String(from);
    }

    if (to) {
      where.entryDate[Op.lte] = String(to);
    }
  }

  if (sourceType) {
    where.sourceType = String(sourceType);
  }

  return where;
};

const createLedgerAccountRow = (account) => ({
  accountId: account.id,
  accountCode: account.code,
  accountName: account.name,
  accountType: account.type,
  normalBalance: account.normalBalance,
  openingBalance: 0,
  movements: [],
  debitTotal: 0,
  creditTotal: 0,
  closingBalance: 0,
});

const applyAmountToBalance = ({ normalBalance, debit, credit }) => {
  return normalBalance === 'credit' ? credit - debit : debit - credit;
};

async function getGeneralLedger({
  companyId,
  from = null,
  to = null,
  accountId = null,
  accountCode = null,
  sourceType = null,
}) {
  let targetAccount = null;

  if (accountId || accountCode) {
    targetAccount = await ChartAccount.findOne({
      where: {
        companyId,
        ...(accountId ? { id: accountId } : {}),
        ...(accountCode ? { code: String(accountCode) } : {}),
      },
      attributes: ['id', 'code', 'name', 'type', 'normalBalance'],
    });

    if (!targetAccount) {
      return {
        companyId,
        filters: {
          from,
          to,
          accountId,
          accountCode,
          sourceType,
          status: 'posted',
        },
        accounts: [],
        totals: {
          openingBalance: 0,
          debitTotal: 0,
          creditTotal: 0,
          closingBalance: 0,
        },
      };
    }
  }

  const lineWhere = {
    companyId,
    ...(targetAccount ? { accountId: targetAccount.id } : {}),
  };

  const fetchEntries = (where) =>
    JournalEntry.findAll({
      where,
      include: [
        {
          model: JournalEntryLine,
          as: 'lines',
          required: true,
          where: lineWhere,
          include: [
            {
              model: ChartAccount,
              as: 'account',
              required: true,
              attributes: ['id', 'code', 'name', 'type', 'normalBalance'],
            },
          ],
        },
      ],
      order: [
        ['entryDate', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

  const openingEntries = from
    ? await fetchEntries(
        buildGeneralLedgerEntryWhere({
          companyId,
          from: null,
          to: null,
          sourceType,
          beforeDate: from,
        }),
      )
    : [];

  const periodEntries = await fetchEntries(
    buildGeneralLedgerEntryWhere({
      companyId,
      from,
      to,
      sourceType,
    }),
  );

  const accountMap = new Map();

  const ensureRow = (account) => {
    if (!accountMap.has(account.id)) {
      accountMap.set(account.id, createLedgerAccountRow(account));
    }

    return accountMap.get(account.id);
  };

  for (const entry of openingEntries) {
    for (const line of entry.lines || []) {
      const account = line.account;
      if (!account) {
        continue;
      }

      const row = ensureRow(account);
      row.openingBalance += applyAmountToBalance({
        normalBalance: account.normalBalance,
        debit: toNumber(line.debit),
        credit: toNumber(line.credit),
      });
    }
  }

  for (const entry of periodEntries) {
    for (const line of entry.lines || []) {
      const account = line.account;
      if (!account) {
        continue;
      }

      const row = ensureRow(account);
      const debit = toNumber(line.debit);
      const credit = toNumber(line.credit);

      row.debitTotal += debit;
      row.creditTotal += credit;

      row.movements.push({
        journalEntryId: entry.id,
        journalEntryLineId: line.id,
        entryDate: entry.entryDate,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        description: line.description || entry.description || null,
        debit: roundMoney(debit),
        credit: roundMoney(credit),
        balanceImpact: roundMoney(
          applyAmountToBalance({
            normalBalance: account.normalBalance,
            debit,
            credit,
          }),
        ),
      });
    }
  }

  const accounts = Array.from(accountMap.values())
    .map((row) => {
      const periodImpact = applyAmountToBalance({
        normalBalance: row.normalBalance,
        debit: row.debitTotal,
        credit: row.creditTotal,
      });

      return {
        ...row,
        openingBalance: roundMoney(row.openingBalance),
        debitTotal: roundMoney(row.debitTotal),
        creditTotal: roundMoney(row.creditTotal),
        closingBalance: roundMoney(row.openingBalance + periodImpact),
      };
    })
    .sort((a, b) => String(a.accountCode).localeCompare(String(b.accountCode)));

  return {
    companyId,
    filters: {
      from,
      to,
      accountId,
      accountCode,
      sourceType,
      status: 'posted',
    },
    accounts,
    totals: {
      openingBalance: roundMoney(accounts.reduce((sum, account) => sum + account.openingBalance, 0)),
      debitTotal: roundMoney(accounts.reduce((sum, account) => sum + account.debitTotal, 0)),
      creditTotal: roundMoney(accounts.reduce((sum, account) => sum + account.creditTotal, 0)),
      closingBalance: roundMoney(accounts.reduce((sum, account) => sum + account.closingBalance, 0)),
    },
  };
}

async function getAccountLedger({
  companyId,
  from = null,
  to = null,
  accountId = null,
  accountCode = null,
  sourceType = null,
}) {
  if (!accountId && !accountCode) {
    const error = new Error('accountId or accountCode is required for account ledger report.');
    error.status = 400;
    error.code = 'ACCOUNT_LEDGER_ACCOUNT_REQUIRED';
    throw error;
  }

  const ledger = await getGeneralLedger({
    companyId,
    from,
    to,
    accountId,
    accountCode,
    sourceType,
  });

  const account = ledger.accounts[0] || null;

  if (!account) {
    return {
      companyId,
      filters: ledger.filters,
      account: null,
      openingBalance: 0,
      movements: [],
      debitTotal: 0,
      creditTotal: 0,
      closingBalance: 0,
      totals: {
        openingBalance: 0,
        debitTotal: 0,
        creditTotal: 0,
        closingBalance: 0,
      },
    };
  }

  return {
    companyId,
    filters: ledger.filters,
    account: {
      accountId: account.accountId,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      normalBalance: account.normalBalance,
    },
    openingBalance: account.openingBalance,
    movements: account.movements,
    debitTotal: account.debitTotal,
    creditTotal: account.creditTotal,
    closingBalance: account.closingBalance,
    totals: {
      openingBalance: account.openingBalance,
      debitTotal: account.debitTotal,
      creditTotal: account.creditTotal,
      closingBalance: account.closingBalance,
    },
  };
}

const buildVatSummaryLineWhere = ({ companyId, taxCode, vatRate }) => {
  const where = { companyId };

  if (taxCode) {
    where.taxCode = String(taxCode);
  }

  if (vatRate !== null && vatRate !== undefined && vatRate !== '') {
    where.vatRate = vatRate;
  }

  return where;
};

async function getVatSummary({ companyId, from = null, to = null, taxCode = null, vatRate = null }) {
  const journalEntries = await JournalEntry.findAll({
    where: buildPostedJournalEntryWhere({ companyId, from, to }),
    include: [
      {
        model: JournalEntryLine,
        as: 'lines',
        required: true,
        where: buildVatSummaryLineWhere({ companyId, taxCode, vatRate }),
        include: [
          {
            model: ChartAccount,
            as: 'account',
            required: true,
            attributes: ['id', 'code', 'name', 'type', 'normalBalance', 'taxCategory'],
          },
        ],
      },
    ],
    order: [
      ['entryDate', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  const rows = [];
  let inputVatTotal = 0;
  let outputVatTotal = 0;

  for (const entry of journalEntries) {
    for (const line of entry.lines || []) {
      const account = line.account;
      if (!account || account.type !== 'tax') {
        continue;
      }

      const debit = toNumber(line.debit);
      const credit = toNumber(line.credit);
      const taxCategory = account.taxCategory || null;

      let vatDirection = 'other';
      let amount = 0;

      if (taxCategory === 'input_vat') {
        vatDirection = 'input';
        amount = debit - credit;
        inputVatTotal += amount;
      } else if (taxCategory === 'output_vat') {
        vatDirection = 'output';
        amount = credit - debit;
        outputVatTotal += amount;
      } else {
        amount = account.normalBalance === 'credit' ? credit - debit : debit - credit;
      }

      rows.push({
        journalEntryId: entry.id,
        journalEntryLineId: line.id,
        entryDate: entry.entryDate,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        taxCategory,
        vatDirection,
        taxCode: line.taxCode || null,
        vatRate: line.vatRate === null || line.vatRate === undefined ? null : toNumber(line.vatRate),
        debit: roundMoney(debit),
        credit: roundMoney(credit),
        amount: roundMoney(amount),
        description: line.description || entry.description || null,
      });
    }
  }

  const roundedInputVatTotal = roundMoney(inputVatTotal);
  const roundedOutputVatTotal = roundMoney(outputVatTotal);
  const netVatPayable = roundMoney(roundedOutputVatTotal - roundedInputVatTotal);

  return {
    companyId,
    filters: {
      from,
      to,
      taxCode,
      vatRate,
      status: 'posted',
    },
    inputVat: {
      total: roundedInputVatTotal,
      rows: rows.filter((row) => row.vatDirection === 'input'),
    },
    outputVat: {
      total: roundedOutputVatTotal,
      rows: rows.filter((row) => row.vatDirection === 'output'),
    },
    rows,
    totals: {
      inputVatTotal: roundedInputVatTotal,
      outputVatTotal: roundedOutputVatTotal,
      netVatPayable,
      isPayable: netVatPayable >= 0,
    },
  };
}

module.exports = {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getGeneralLedger,
  getAccountLedger,
  getVatSummary,
};
