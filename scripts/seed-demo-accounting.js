#!/usr/bin/env node

require('dotenv').config({ path: './server/.env', override: true });

const {
  sequelize,
  Company,
  User,
  Invoice,
  Expense,
  ChartAccount,
  JournalEntry,
} = require('../src/models');

const accountingPostingService = require('../src/services/accountingPostingService');

const requireDemoSeedEnabled = () => {
  const demoModeEnabled = process.env.DEMO_MODE === 'true';
  const demoSeedAllowed = process.env.ALLOW_DEMO_SEED === 'true';

  if (!demoModeEnabled || !demoSeedAllowed) {
    throw new Error(
      '[seed-demo-accounting] refused: requires DEMO_MODE=true and ALLOW_DEMO_SEED=true ' +
      `(DEMO_MODE=${process.env.DEMO_MODE || 'undefined'}, ALLOW_DEMO_SEED=${process.env.ALLOW_DEMO_SEED || 'undefined'})`,
    );
  }
};

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => Number(toNumber(value).toFixed(2));

const ensureAccount = async ({
  companyId,
  code,
  name,
  type,
  normalBalance,
  taxCategory = null,
}) => {
  const [account, created] = await ChartAccount.findOrCreate({
    where: { companyId, code },
    defaults: {
      companyId,
      code,
      name,
      type,
      normalBalance,
      taxCategory,
      isSystem: true,
    },
  });

  if (created) {
    console.log(`[seed-demo-accounting] account created ${code} ${name}`);
  } else {
    console.log(`[seed-demo-accounting] account exists ${code} ${account.name}`);
  }

  return account;
};

const findDemoCompany = async () => {
  const company =
    (await Company.findOne({ where: { taxId: 'DE123456789' } })) ||
    (await Company.findOne({ where: { name: 'SmartAccounting Demo GmbH' } })) ||
    (await Company.findOne({ order: [['id', 'ASC']] }));

  if (!company) {
    throw new Error('[seed-demo-accounting] no company found. Run demo seed first.');
  }

  return company;
};

const findPostingUser = async (companyId) => {
  const user =
    (await User.findOne({ where: { companyId, role: 'admin' }, order: [['id', 'ASC']] })) ||
    (await User.findOne({ where: { companyId }, order: [['id', 'ASC']] }));

  if (!user) {
    throw new Error(`[seed-demo-accounting] no user found for companyId=${companyId}. Run demo seed first.`);
  }

  return user;
};

const ensurePostedEntry = async ({
  companyId,
  entryDate,
  sourceType,
  sourceId,
  createdBy,
  description,
  lines,
}) => {
  const existingPosted = await JournalEntry.findOne({
    where: {
      companyId,
      sourceType,
      sourceId: String(sourceId),
      status: 'posted',
    },
  });

  if (existingPosted) {
    console.log(`[seed-demo-accounting] posted entry exists ${sourceType}:${sourceId}`);
    return existingPosted;
  }

  const existingAny = await JournalEntry.findOne({
    where: {
      companyId,
      sourceType,
      sourceId: String(sourceId),
    },
  });

  if (existingAny && existingAny.status !== 'draft') {
    console.log(`[seed-demo-accounting] entry exists with status=${existingAny.status} ${sourceType}:${sourceId}`);
    return existingAny;
  }

  const draft = existingAny
    ? { journalEntry: existingAny }
    : await accountingPostingService.createJournalEntryDraft({
        companyId,
        entryDate,
        sourceType,
        sourceId: String(sourceId),
        createdBy,
        description,
        lines,
      });

  await draft.journalEntry.update(
    {
      status: 'posted',
      postedAt: new Date(),
      postedBy: createdBy,
    },
    { allowPostedJournalEntryMutation: true },
  );

  console.log(`[seed-demo-accounting] posted entry created ${sourceType}:${sourceId}`);
  return draft.journalEntry;
};

const seedInvoicePostings = async ({ companyId, userId, accounts }) => {
  const invoices = await Invoice.findAll({
    where: { companyId },
    order: [['date', 'ASC'], ['id', 'ASC']],
    limit: 6,
  });

  let count = 0;

  for (const invoice of invoices) {
    const gross = roundMoney(invoice.total || invoice.amount || 0);
    if (gross <= 0) {
      continue;
    }

    const net = roundMoney(invoice.subtotal || gross / 1.19);
    const vat = roundMoney(gross - net);

    const debitAccount = String(invoice.status || '').toUpperCase() === 'PAID'
      ? accounts.bank
      : accounts.receivables;

    const lines = [
      {
        accountId: debitAccount.id,
        debit: gross,
        credit: 0,
        description: `Demo invoice gross ${invoice.invoiceNumber || invoice.id}`,
      },
      {
        accountId: accounts.revenue.id,
        debit: 0,
        credit: net,
        description: `Demo invoice net ${invoice.invoiceNumber || invoice.id}`,
      },
    ];

    if (vat > 0) {
      lines.push({
        accountId: accounts.outputVat.id,
        debit: 0,
        credit: vat,
        taxCode: 'DE_19',
        vatRate: 19,
        description: `Demo invoice output VAT ${invoice.invoiceNumber || invoice.id}`,
      });
    }

    await ensurePostedEntry({
      companyId,
      entryDate: invoice.date || invoice.createdAt || new Date(),
      sourceType: 'invoice',
      sourceId: invoice.id,
      createdBy: userId,
      description: `Demo posted invoice ${invoice.invoiceNumber || invoice.id}`,
      lines,
    });

    count += 1;
  }

  return count;
};

const seedExpensePostings = async ({ companyId, userId, accounts }) => {
  const expenses = await Expense.findAll({
    where: { companyId },
    order: [['expenseDate', 'ASC'], ['date', 'ASC'], ['id', 'ASC']],
    limit: 6,
  });

  let count = 0;

  for (const expense of expenses) {
    const gross = roundMoney(expense.grossAmount || expense.amount || 0);
    if (gross <= 0) {
      continue;
    }

    const net = roundMoney(expense.netAmount || gross / 1.19);
    const vat = roundMoney(expense.vatAmount || gross - net);

    const lines = [
      {
        accountId: accounts.expense.id,
        debit: net,
        credit: 0,
        description: `Demo expense net ${expense.description || expense.id}`,
      },
    ];

    if (vat > 0) {
      lines.push({
        accountId: accounts.inputVat.id,
        debit: vat,
        credit: 0,
        taxCode: Number(expense.vatRate || 0) === 0.07 ? 'DE_7' : 'DE_19',
        vatRate: Number(expense.vatRate || 0) === 0.07 ? 7 : 19,
        description: `Demo expense input VAT ${expense.description || expense.id}`,
      });
    }

    lines.push({
      accountId: accounts.payable.id,
      debit: 0,
      credit: gross,
      description: `Demo expense payable ${expense.description || expense.id}`,
    });

    await ensurePostedEntry({
      companyId,
      entryDate: expense.expenseDate || expense.date || expense.createdAt || new Date(),
      sourceType: 'expense',
      sourceId: expense.id,
      createdBy: userId,
      description: `Demo posted expense ${expense.description || expense.id}`,
      lines,
    });

    count += 1;
  }

  return count;
};

const seedOpeningBalance = async ({ companyId, userId, accounts }) => {
  await ensurePostedEntry({
    companyId,
    entryDate: '2026-01-01',
    sourceType: 'manual',
    sourceId: 'demo-opening-balance-2026',
    createdBy: userId,
    description: 'Demo opening balance 2026',
    lines: [
      {
        accountId: accounts.bank.id,
        debit: 5000,
        credit: 0,
        description: 'Opening bank balance',
      },
      {
        accountId: accounts.equity.id,
        debit: 0,
        credit: 5000,
        description: 'Opening equity',
      },
    ],
  });
};

const main = async () => {
  requireDemoSeedEnabled();

  await sequelize.authenticate();

  const company = await findDemoCompany();
  const user = await findPostingUser(company.id);

  console.log(`[seed-demo-accounting] company=${company.id} ${company.name}`);
  console.log(`[seed-demo-accounting] postingUser=${user.id} ${user.email}`);

  const accounts = {
    bank: await ensureAccount({
      companyId: company.id,
      code: '1200',
      name: 'Bank',
      type: 'asset',
      normalBalance: 'debit',
    }),
    receivables: await ensureAccount({
      companyId: company.id,
      code: '1400',
      name: 'Accounts receivable',
      type: 'asset',
      normalBalance: 'debit',
    }),
    inputVat: await ensureAccount({
      companyId: company.id,
      code: '1576',
      name: 'Input VAT 19%',
      type: 'tax',
      normalBalance: 'debit',
      taxCategory: 'input_vat',
    }),
    payable: await ensureAccount({
      companyId: company.id,
      code: '1600',
      name: 'Accounts payable',
      type: 'liability',
      normalBalance: 'credit',
    }),
    outputVat: await ensureAccount({
      companyId: company.id,
      code: '1776',
      name: 'Output VAT 19%',
      type: 'tax',
      normalBalance: 'credit',
      taxCategory: 'output_vat',
    }),
    equity: await ensureAccount({
      companyId: company.id,
      code: '0800',
      name: 'Owner equity',
      type: 'equity',
      normalBalance: 'credit',
    }),
    revenue: await ensureAccount({
      companyId: company.id,
      code: '8400',
      name: 'Sales revenue 19%',
      type: 'revenue',
      normalBalance: 'credit',
    }),
    expense: await ensureAccount({
      companyId: company.id,
      code: '4930',
      name: 'General expenses',
      type: 'expense',
      normalBalance: 'debit',
    }),
  };

  await seedOpeningBalance({ companyId: company.id, userId: user.id, accounts });

  const invoiceCount = await seedInvoicePostings({
    companyId: company.id,
    userId: user.id,
    accounts,
  });

  const expenseCount = await seedExpensePostings({
    companyId: company.id,
    userId: user.id,
    accounts,
  });

  const postedEntries = await JournalEntry.count({
    where: {
      companyId: company.id,
      status: 'posted',
    },
  });

  const chartAccounts = await ChartAccount.count({
    where: {
      companyId: company.id,
    },
  });

  console.log('[seed-demo-accounting] summary', {
    chartAccounts,
    invoicePostingsConsidered: invoiceCount,
    expensePostingsConsidered: expenseCount,
    postedEntries,
  });

  console.log('[seed-demo-accounting] DEMO ACCOUNTING READY');
};

main()
  .catch((error) => {
    console.error('[seed-demo-accounting] FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
