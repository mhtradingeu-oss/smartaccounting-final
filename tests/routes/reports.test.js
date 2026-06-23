const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Company, User, ChartAccount } = require('../../src/models');
const accountingPostingService = require('../../src/services/accountingPostingService');

describe('Financial reports API', () => {
  let company;
  let otherCompany;
  let admin;
  let accountant;
  let auditor;
  let viewer;
  let expenseAccount;
  let payableAccount;
  let revenueAccount;
  let assetAccount;
  let equityAccount;

  const createRoleSession = async (role, companyId = company.id) => {
    const session = await global.testUtils.createTestUserAndLogin({
      role,
      companyId,
    });

    return {
      user: session.user,
      token: session.token,
    };
  };

  const requestFor = ({ url, token, companyId }) => {
    return request(app)
      .get(url)
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(companyId));
  };

  const createPostedJournalEntry = async ({
    companyId = company.id,
    userId = accountant.user.id,
    entryDate = '2026-06-21',
    expenseAccountId = expenseAccount.id,
    payableAccountId = payableAccount.id,
  } = {}) => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId,
      entryDate,
      sourceType: 'manual',
      sourceId: `trial-balance-${Date.now()}-${Math.random()}`,
      createdBy: userId,
      lines: [
        { accountId: expenseAccountId, debit: 100, credit: 0 },
        { accountId: payableAccountId, debit: 0, credit: 100 },
      ],
    });

    await draft.journalEntry.update(
      {
        status: 'posted',
        postedAt: new Date(),
        postedBy: userId,
      },
      { allowPostedJournalEntryMutation: true },
    );

    return draft.journalEntry;
  };


  const createPostedProfitLossEntries = async ({
    entryDate = '2026-06-21',
    revenue = 300,
    expenses = 100,
  } = {}) => {
    const revenueDraft = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate,
      sourceType: 'manual',
      sourceId: `profit-loss-revenue-${Date.now()}-${Math.random()}`,
      createdBy: accountant.user.id,
      lines: [
        { accountId: payableAccount.id, debit: revenue, credit: 0 },
        { accountId: revenueAccount.id, debit: 0, credit: revenue },
      ],
    });

    await revenueDraft.journalEntry.update(
      {
        status: 'posted',
        postedAt: new Date(),
        postedBy: accountant.user.id,
      },
      { allowPostedJournalEntryMutation: true },
    );

    const expenseDraft = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate,
      sourceType: 'manual',
      sourceId: `profit-loss-expense-${Date.now()}-${Math.random()}`,
      createdBy: accountant.user.id,
      lines: [
        { accountId: expenseAccount.id, debit: expenses, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: expenses },
      ],
    });

    await expenseDraft.journalEntry.update(
      {
        status: 'posted',
        postedAt: new Date(),
        postedBy: accountant.user.id,
      },
      { allowPostedJournalEntryMutation: true },
    );
  };


  const createPostedBalanceSheetEntry = async ({
    entryDate = '2026-06-21',
    assetAmount = 500,
    liabilityAmount = 200,
    equityAmount = 300,
  } = {}) => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate,
      sourceType: 'manual',
      sourceId: `balance-sheet-${Date.now()}-${Math.random()}`,
      createdBy: accountant.user.id,
      lines: [
        { accountId: assetAccount.id, debit: assetAmount, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: liabilityAmount },
        { accountId: equityAccount.id, debit: 0, credit: equityAmount },
      ],
    });

    await draft.journalEntry.update(
      {
        status: 'posted',
        postedAt: new Date(),
        postedBy: accountant.user.id,
      },
      { allowPostedJournalEntryMutation: true },
    );

    return draft.journalEntry;
  };


  const createPostedLedgerEntry = async ({
    entryDate = '2026-06-21',
    sourceType = 'manual',
    sourceId = `general-ledger-${Date.now()}-${Math.random()}`,
    debitAccountId = expenseAccount.id,
    creditAccountId = payableAccount.id,
    amount = 100,
  } = {}) => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate,
      sourceType,
      sourceId,
      createdBy: accountant.user.id,
      lines: [
        { accountId: debitAccountId, debit: amount, credit: 0 },
        { accountId: creditAccountId, debit: 0, credit: amount },
      ],
    });

    await draft.journalEntry.update(
      {
        status: 'posted',
        postedAt: new Date(),
        postedBy: accountant.user.id,
      },
      { allowPostedJournalEntryMutation: true },
    );

    return draft.journalEntry;
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.truncate({ cascade: true, restartIdentity: true });

    company = await Company.create({
      name: 'Report Company GmbH',
      taxId: 'REPORT-001',
      vatId: 'DE111111111',
      address: 'Report Str. 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
    });

    otherCompany = await Company.create({
      name: 'Other Report Company GmbH',
      taxId: 'REPORT-002',
      vatId: 'DE222222222',
      address: 'Other Report Str. 2',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'Germany',
    });

    admin = await createRoleSession('admin');
    accountant = await createRoleSession('accountant');
    auditor = await createRoleSession('auditor');
    viewer = await createRoleSession('viewer');

    expenseAccount = await ChartAccount.create({
      companyId: company.id,
      code: '4930',
      name: 'Office expenses',
      type: 'expense',
      normalBalance: 'debit',
      isSystem: true,
    });

    payableAccount = await ChartAccount.create({
      companyId: company.id,
      code: '1600',
      name: 'Trade payables',
      type: 'liability',
      normalBalance: 'credit',
      isSystem: true,
    });

    revenueAccount = await ChartAccount.create({
      companyId: company.id,
      code: '8400',
      name: 'Sales revenue',
      type: 'revenue',
      normalBalance: 'credit',
      isSystem: true,
    });

    assetAccount = await ChartAccount.create({
      companyId: company.id,
      code: '1200',
      name: 'Bank',
      type: 'asset',
      normalBalance: 'debit',
      isSystem: true,
    });

    equityAccount = await ChartAccount.create({
      companyId: company.id,
      code: '3000',
      name: 'Owner equity',
      type: 'equity',
      normalBalance: 'credit',
      isSystem: true,
    });
  });

  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can read the trial balance report', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];

    await createPostedJournalEntry();

    const response = await requestFor({
      url: '/api/reports/trial-balance',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report.companyId).toBe(company.id);
    expect(response.body.report.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '4930',
          debitTotal: 100,
          creditTotal: 0,
          balance: 100,
        }),
        expect.objectContaining({
          accountCode: '1600',
          debitTotal: 0,
          creditTotal: 100,
          balance: 100,
        }),
      ]),
    );
    expect(response.body.report.totals).toEqual(
      expect.objectContaining({
        totalDebits: 100,
        totalCredits: 100,
        difference: 0,
        isBalanced: true,
      }),
    );
  });

  it('uses only posted journal entries in trial balance', async () => {
    await createPostedJournalEntry();

    await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'draft-should-not-count',
      createdBy: accountant.user.id,
      lines: [
        { accountId: expenseAccount.id, debit: 999, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 999 },
      ],
    });

    const response = await requestFor({
      url: '/api/reports/trial-balance',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals.totalDebits).toBe(100);
    expect(response.body.report.totals.totalCredits).toBe(100);
  });

  it('filters trial balance by date range', async () => {
    await createPostedJournalEntry({ entryDate: '2026-06-01' });
    await createPostedJournalEntry({ entryDate: '2026-07-01' });

    const response = await requestFor({
      url: '/api/reports/trial-balance?from=2026-07-01&to=2026-07-31',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals.totalDebits).toBe(100);
    expect(response.body.report.totals.totalCredits).toBe(100);
    expect(response.body.report.filters).toEqual(
      expect.objectContaining({
        from: '2026-07-01',
        to: '2026-07-31',
        status: 'posted',
      }),
    );
  });

  it('prevents cross-company trial balance access', async () => {
    await createPostedJournalEntry();

    const response = await requestFor({
      url: '/api/reports/trial-balance',
      token: accountant.token,
      companyId: otherCompany.id,
    });

    expect(response.status).toBe(403);
  });
  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can read the profit and loss report', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];

    await createPostedProfitLossEntries();

    const response = await requestFor({
      url: '/api/reports/profit-loss',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report.companyId).toBe(company.id);
    expect(response.body.report.revenue.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '8400',
          creditTotal: 300,
          balance: 300,
        }),
      ]),
    );
    expect(response.body.report.expenses.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '4930',
          debitTotal: 100,
          balance: 100,
        }),
      ]),
    );
    expect(response.body.report.totals).toEqual(
      expect.objectContaining({
        totalRevenue: 300,
        totalExpenses: 100,
        netProfit: 200,
        isProfit: true,
      }),
    );
  });

  it('uses only posted journal entries in profit and loss report', async () => {
    await createPostedProfitLossEntries();

    await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'draft-profit-loss-should-not-count',
      createdBy: accountant.user.id,
      lines: [
        { accountId: payableAccount.id, debit: 999, credit: 0 },
        { accountId: revenueAccount.id, debit: 0, credit: 999 },
      ],
    });

    const response = await requestFor({
      url: '/api/reports/profit-loss',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals.totalRevenue).toBe(300);
    expect(response.body.report.totals.totalExpenses).toBe(100);
    expect(response.body.report.totals.netProfit).toBe(200);
  });

  it('filters profit and loss by date range', async () => {
    await createPostedProfitLossEntries({ entryDate: '2026-06-01', revenue: 500, expenses: 400 });
    await createPostedProfitLossEntries({ entryDate: '2026-07-01', revenue: 300, expenses: 100 });

    const response = await requestFor({
      url: '/api/reports/profit-loss?from=2026-07-01&to=2026-07-31',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals).toEqual(
      expect.objectContaining({
        totalRevenue: 300,
        totalExpenses: 100,
        netProfit: 200,
      }),
    );
    expect(response.body.report.filters).toEqual(
      expect.objectContaining({
        from: '2026-07-01',
        to: '2026-07-31',
        status: 'posted',
      }),
    );
  });

  it('prevents cross-company profit and loss access', async () => {
    await createPostedProfitLossEntries();

    const response = await requestFor({
      url: '/api/reports/profit-loss',
      token: accountant.token,
      companyId: otherCompany.id,
    });

    expect(response.status).toBe(403);
  });

  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can read the balance sheet report', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];

    await createPostedBalanceSheetEntry();

    const response = await requestFor({
      url: '/api/reports/balance-sheet',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report.companyId).toBe(company.id);
    expect(response.body.report.assets.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '1200',
          debitTotal: 500,
          balance: 500,
        }),
      ]),
    );
    expect(response.body.report.liabilities.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '1600',
          creditTotal: 200,
          balance: 200,
        }),
      ]),
    );
    expect(response.body.report.equity.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '3000',
          creditTotal: 300,
          balance: 300,
        }),
      ]),
    );
    expect(response.body.report.totals).toEqual(
      expect.objectContaining({
        totalAssets: 500,
        totalLiabilities: 200,
        totalEquity: 300,
        liabilitiesAndEquity: 500,
        accountingEquationDifference: 0,
        isBalanced: true,
      }),
    );
  });

  it('uses only posted journal entries in balance sheet report', async () => {
    await createPostedBalanceSheetEntry();

    await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'draft-balance-sheet-should-not-count',
      createdBy: accountant.user.id,
      lines: [
        { accountId: assetAccount.id, debit: 999, credit: 0 },
        { accountId: equityAccount.id, debit: 0, credit: 999 },
      ],
    });

    const response = await requestFor({
      url: '/api/reports/balance-sheet',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals.totalAssets).toBe(500);
    expect(response.body.report.totals.liabilitiesAndEquity).toBe(500);
    expect(response.body.report.totals.isBalanced).toBe(true);
  });

  it('filters balance sheet by asOf date', async () => {
    await createPostedBalanceSheetEntry({
      entryDate: '2026-06-01',
      assetAmount: 100,
      liabilityAmount: 40,
      equityAmount: 60,
    });
    await createPostedBalanceSheetEntry({
      entryDate: '2026-07-01',
      assetAmount: 500,
      liabilityAmount: 200,
      equityAmount: 300,
    });

    const response = await requestFor({
      url: '/api/reports/balance-sheet?asOf=2026-06-30',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals).toEqual(
      expect.objectContaining({
        totalAssets: 100,
        totalLiabilities: 40,
        totalEquity: 60,
        liabilitiesAndEquity: 100,
        accountingEquationDifference: 0,
        isBalanced: true,
      }),
    );
    expect(response.body.report.filters).toEqual(
      expect.objectContaining({
        asOf: '2026-06-30',
        status: 'posted',
      }),
    );
  });

  it('prevents cross-company balance sheet access', async () => {
    await createPostedBalanceSheetEntry();

    const response = await requestFor({
      url: '/api/reports/balance-sheet',
      token: accountant.token,
      companyId: otherCompany.id,
    });

    expect(response.status).toBe(403);
  });

  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can read the general ledger report', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];

    await createPostedLedgerEntry();

    const response = await requestFor({
      url: '/api/reports/general-ledger',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report.companyId).toBe(company.id);
    expect(response.body.report.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '4930',
          debitTotal: 100,
          creditTotal: 0,
          closingBalance: 100,
        }),
        expect.objectContaining({
          accountCode: '1600',
          debitTotal: 0,
          creditTotal: 100,
          closingBalance: 100,
        }),
      ]),
    );
  });

  it('calculates opening and closing balances for general ledger date range', async () => {
    await createPostedLedgerEntry({ entryDate: '2026-05-31', amount: 50 });
    await createPostedLedgerEntry({ entryDate: '2026-06-15', amount: 100 });
    await createPostedLedgerEntry({ entryDate: '2026-07-01', amount: 999 });

    const response = await requestFor({
      url: '/api/reports/general-ledger?from=2026-06-01&to=2026-06-30&accountCode=4930',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.accounts).toHaveLength(1);
    expect(response.body.report.accounts[0]).toEqual(
      expect.objectContaining({
        accountCode: '4930',
        openingBalance: 50,
        debitTotal: 100,
        creditTotal: 0,
        closingBalance: 150,
      }),
    );
    expect(response.body.report.accounts[0].movements).toHaveLength(1);
  });

  it('filters general ledger by sourceType', async () => {
    await createPostedLedgerEntry({ sourceType: 'manual', amount: 100 });
    await createPostedLedgerEntry({ sourceType: 'expense', amount: 250 });

    const response = await requestFor({
      url: '/api/reports/general-ledger?sourceType=expense&accountCode=4930',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.accounts).toHaveLength(1);
    expect(response.body.report.accounts[0]).toEqual(
      expect.objectContaining({
        accountCode: '4930',
        debitTotal: 250,
        closingBalance: 250,
      }),
    );
    expect(response.body.report.accounts[0].movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'expense',
          debit: 250,
        }),
      ]),
    );
  });

  it('uses only posted journal entries in general ledger report', async () => {
    await createPostedLedgerEntry({ amount: 100 });

    await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'draft-general-ledger-should-not-count',
      createdBy: accountant.user.id,
      lines: [
        { accountId: expenseAccount.id, debit: 999, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 999 },
      ],
    });

    const response = await requestFor({
      url: '/api/reports/general-ledger?accountCode=4930',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.accounts[0].debitTotal).toBe(100);
    expect(response.body.report.accounts[0].closingBalance).toBe(100);
  });

  it('prevents cross-company general ledger access', async () => {
    await createPostedLedgerEntry();

    const response = await requestFor({
      url: '/api/reports/general-ledger',
      token: accountant.token,
      companyId: otherCompany.id,
    });

    expect(response.status).toBe(403);
  });

  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can read the account ledger report', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];

    await createPostedLedgerEntry({ amount: 125 });

    const response = await requestFor({
      url: '/api/reports/account-ledger?accountCode=4930',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report.companyId).toBe(company.id);
    expect(response.body.report.account).toEqual(
      expect.objectContaining({
        accountCode: '4930',
        accountName: 'Office expenses',
        accountType: 'expense',
        normalBalance: 'debit',
      }),
    );
    expect(response.body.report).toEqual(
      expect.objectContaining({
        openingBalance: 0,
        debitTotal: 125,
        creditTotal: 0,
        closingBalance: 125,
      }),
    );
    expect(response.body.report.movements).toHaveLength(1);
  });

  it('requires accountId or accountCode for account ledger report', async () => {
    const response = await requestFor({
      url: '/api/reports/account-ledger',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: true,
        errorCode: 'ACCOUNT_LEDGER_ACCOUNT_REQUIRED',
      }),
    );
  });

  it('calculates account ledger opening and closing balances by date range', async () => {
    await createPostedLedgerEntry({ entryDate: '2026-05-31', amount: 50 });
    await createPostedLedgerEntry({ entryDate: '2026-06-15', amount: 100 });
    await createPostedLedgerEntry({ entryDate: '2026-07-01', amount: 999 });

    const response = await requestFor({
      url: '/api/reports/account-ledger?from=2026-06-01&to=2026-06-30&accountCode=4930',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.account).toEqual(
      expect.objectContaining({
        accountCode: '4930',
      }),
    );
    expect(response.body.report).toEqual(
      expect.objectContaining({
        openingBalance: 50,
        debitTotal: 100,
        creditTotal: 0,
        closingBalance: 150,
      }),
    );
    expect(response.body.report.movements).toHaveLength(1);
  });

  it('filters account ledger by sourceType', async () => {
    await createPostedLedgerEntry({ sourceType: 'manual', amount: 100 });
    await createPostedLedgerEntry({ sourceType: 'expense', amount: 250 });

    const response = await requestFor({
      url: '/api/reports/account-ledger?sourceType=expense&accountCode=4930',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.debitTotal).toBe(250);
    expect(response.body.report.closingBalance).toBe(250);
    expect(response.body.report.movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'expense',
          debit: 250,
        }),
      ]),
    );
  });

  it('returns an empty account ledger for missing same-company account', async () => {
    const response = await requestFor({
      url: '/api/reports/account-ledger?accountCode=9999',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.account).toBeNull();
    expect(response.body.report.movements).toEqual([]);
    expect(response.body.report.closingBalance).toBe(0);
  });

  it('prevents cross-company account ledger access', async () => {
    await createPostedLedgerEntry();

    const response = await requestFor({
      url: '/api/reports/account-ledger?accountCode=4930',
      token: accountant.token,
      companyId: otherCompany.id,
    });

    expect(response.status).toBe(403);
  });

});
