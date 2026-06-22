const { Op } = require('sequelize');
const { JournalEntry, JournalEntryLine, ChartAccount } = require('../models');

const toNumber = (value) => Number.parseFloat(value || 0);

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const buildTrialBalanceWhere = ({ companyId, from, to }) => {
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
    where: buildTrialBalanceWhere({ companyId, from, to }),
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

module.exports = {
  getTrialBalance,
};
