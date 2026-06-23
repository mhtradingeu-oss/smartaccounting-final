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

module.exports = {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
};
