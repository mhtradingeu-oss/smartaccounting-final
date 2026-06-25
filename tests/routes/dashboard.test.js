process.env.API_BASE_URL = '/api';

const app = require('../../src/app');
const { Company, Expense, Invoice, User, ChartAccount, JournalEntry, JournalEntryLine, sequelize } = require('../../src/models');
const accountingPostingService = require('../../src/services/accountingPostingService');
const { buildExpensePayload, buildInvoicePayload } = require('../utils/buildPayload');

const authHeaders = ({ token, companyId }) => ({
  Authorization: `Bearer ${token}`,
  'x-company-id': String(companyId),
});

const requestFor = ({ token, companyId, headers = {} }) =>
  global.requestApp({
    app,
    method: 'GET',
    url: '/api/dashboard/stats',
    headers: token
      ? {
          ...authHeaders({ token, companyId }),
          ...headers,
        }
      : headers,
  });

const createRoleSession = (role = 'accountant') =>
  global.testUtils.createTestUserAndLogin({
    role,
    email: `dashboard-${role}-${Date.now()}-${Math.random()}@example.com`,
  });

const createInvoiceFor = (user, overrides = {}) =>
  Invoice.create(
    buildInvoicePayload({
      userId: user.id,
      companyId: user.companyId,
      status: 'PAID',
      subtotal: 100,
      amount: 119,
      total: 119,
      ...overrides,
    }),
  );

const createExpenseFor = (user, overrides = {}) =>
  Expense.create(
    buildExpensePayload({
      userId: user.id,
      createdByUserId: user.id,
      companyId: user.companyId,
      status: 'booked',
      netAmount: 50,
      vatAmount: 9.5,
      grossAmount: 59.5,
      amount: 59.5,
      ...overrides,
    }),
  );

const createAccountFor = (user, overrides = {}) =>
  ChartAccount.create({
    companyId: user.companyId,
    code: `DASH-${Date.now()}-${Math.random()}`,
    name: 'Dashboard test account',
    type: 'asset',
    normalBalance: 'debit',
    isSystem: true,
    ...overrides,
  });

const postJournalDraft = async (draft, user) => {
  await draft.journalEntry.update(
    {
      status: 'posted',
      postedAt: new Date(),
      postedBy: user.id,
    },
    { allowPostedJournalEntryMutation: true },
  );

  return draft.journalEntry;
};

const createPostedVatSummaryEntryFor = async (
  user,
  { inputVatAmount = 19, outputVatAmount = 38 } = {},
) => {
  const inputVatAccount = await createAccountFor(user, {
    code: `1576-DASH-${Date.now()}-${Math.random()}`,
    name: 'Dashboard input VAT',
    type: 'tax',
    normalBalance: 'debit',
    taxCategory: 'input_vat',
  });

  const outputVatAccount = await createAccountFor(user, {
    code: `1776-DASH-${Date.now()}-${Math.random()}`,
    name: 'Dashboard output VAT',
    type: 'tax',
    normalBalance: 'credit',
    taxCategory: 'output_vat',
  });

  const balancingAccount = await createAccountFor(user, {
    code: `1200-VAT-DASH-${Date.now()}-${Math.random()}`,
    name: 'Dashboard VAT clearing account',
    type: outputVatAmount >= inputVatAmount ? 'asset' : 'liability',
    normalBalance: outputVatAmount >= inputVatAmount ? 'debit' : 'credit',
  });

  const draft = await accountingPostingService.createJournalEntryDraft({
    companyId: user.companyId,
    entryDate: '2026-06-23',
    sourceType: 'manual',
    sourceId: `dashboard-vat-${Date.now()}-${Math.random()}`,
    createdBy: user.id,
    lines: [
      {
        accountId: inputVatAccount.id,
        debit: inputVatAmount,
        credit: 0,
        taxCode: 'DE_19',
        vatRate: 19,
        description: 'Dashboard input VAT test line',
      },
      {
        accountId: outputVatAccount.id,
        debit: 0,
        credit: outputVatAmount,
        taxCode: 'DE_19',
        vatRate: 19,
        description: 'Dashboard output VAT test line',
      },
      {
        accountId: balancingAccount.id,
        debit: outputVatAmount >= inputVatAmount ? outputVatAmount - inputVatAmount : 0,
        credit: inputVatAmount > outputVatAmount ? inputVatAmount - outputVatAmount : 0,
        description: 'Dashboard VAT balancing line',
      },
    ],
  });

  await postJournalDraft(draft, user);
};

const createPostedFinancialOverviewEntries = async (user, { revenue = 700, expenses = 200 } = {}) => {
  const bankAccount = await createAccountFor(user, {
    code: `1200-DASH-${Date.now()}-${Math.random()}`,
    name: 'Dashboard bank',
    type: 'asset',
    normalBalance: 'debit',
  });

  const revenueAccount = await createAccountFor(user, {
    code: `8400-DASH-${Date.now()}-${Math.random()}`,
    name: 'Dashboard revenue',
    type: 'revenue',
    normalBalance: 'credit',
  });

  const expenseAccount = await createAccountFor(user, {
    code: `4930-DASH-${Date.now()}-${Math.random()}`,
    name: 'Dashboard expenses',
    type: 'expense',
    normalBalance: 'debit',
  });

  const revenueDraft = await accountingPostingService.createJournalEntryDraft({
    companyId: user.companyId,
    entryDate: '2026-06-23',
    sourceType: 'manual',
    sourceId: `dashboard-revenue-${Date.now()}-${Math.random()}`,
    createdBy: user.id,
    lines: [
      { accountId: bankAccount.id, debit: revenue, credit: 0 },
      { accountId: revenueAccount.id, debit: 0, credit: revenue },
    ],
  });

  await postJournalDraft(revenueDraft, user);

  const expenseDraft = await accountingPostingService.createJournalEntryDraft({
    companyId: user.companyId,
    entryDate: '2026-06-23',
    sourceType: 'manual',
    sourceId: `dashboard-expense-${Date.now()}-${Math.random()}`,
    createdBy: user.id,
    lines: [
      { accountId: expenseAccount.id, debit: expenses, credit: 0 },
      { accountId: bankAccount.id, debit: 0, credit: expenses },
    ],
  });

  await postJournalDraft(expenseDraft, user);
};

describe('Dashboard stats API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await JournalEntryLine.destroy({ where: {}, force: true });
    await JournalEntry.destroy({ where: {}, force: true });
    await ChartAccount.destroy({ where: {}, force: true });
    await Expense.destroy({ where: {}, force: true });
    await Invoice.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Company.destroy({ where: {}, force: true });
  });

  it('returns the current dashboard contract for an authenticated company user', async () => {
    const { user, token } = await createRoleSession('accountant');

    await createInvoiceFor(user);
    await createExpenseFor(user);

    const response = await requestFor({
      token,
      companyId: user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        companyId: user.companyId,
      }),
    );

    expect(response.body).toHaveProperty('stats');
    expect(response.body).toHaveProperty('invoiceStats');
    expect(response.body).toHaveProperty('monthlyData');
    expect(response.body).toHaveProperty('financialOverview');
    expect(response.body).toHaveProperty('auditReadiness');
    expect(response.body.financialOverview).toEqual(
      expect.objectContaining({
        source: 'posted_journal_entries',
      }),
    );
    expect(response.body.auditReadiness).toEqual(
      expect.objectContaining({
        source: 'deterministic_dashboard_rules',
        status: expect.any(String),
        signals: expect.any(Array),
      }),
    );

    expect(response.body.stats).toEqual(
      expect.objectContaining({
        totalRevenue: 119,
        totalExpenses: 59.5,
        netProfit: 59.5,
        invoiceCount: 1,
      }),
    );

    expect(response.body.invoiceStats).toEqual(
      expect.objectContaining({
        totalRevenue: 119,
        invoiceCount: 1,
      }),
    );

    expect(Array.isArray(response.body.monthlyData)).toBe(true);
  });

  it('uses posted journal entries for financialOverview independently from operational stats', async () => {
    const { user, token } = await createRoleSession('accountant');

    await createInvoiceFor(user, {
      invoiceNumber: 'DASH-OPERATIONAL-001',
      subtotal: 100,
      amount: 119,
      total: 119,
    });
    await createExpenseFor(user, {
      grossAmount: 59.5,
      amount: 59.5,
    });

    await createPostedFinancialOverviewEntries(user, {
      revenue: 700,
      expenses: 200,
    });
    await createPostedVatSummaryEntryFor(user, {
      inputVatAmount: 19,
      outputVatAmount: 38,
    });

    const response = await requestFor({
      token,
      companyId: user.companyId,
    });

    expect(response.status).toBe(200);

    expect(response.body.stats).toEqual(
      expect.objectContaining({
        totalRevenue: 119,
        totalExpenses: 59.5,
        netProfit: 59.5,
      }),
    );

    expect(response.body.financialOverview).toEqual(
      expect.objectContaining({
        source: 'posted_journal_entries',
        revenue: 700,
        expenses: 200,
        netIncome: 500,
        isProfit: true,
        vatSummary: expect.objectContaining({
          inputVat: 19,
          outputVat: 38,
          netVatPayable: 19,
          isPayable: true,
        }),
      }),
    );

    expect(response.body.auditReadiness).toEqual(
      expect.objectContaining({
        source: 'deterministic_dashboard_rules',
        status: 'warning',
        signals: expect.arrayContaining([
          expect.objectContaining({
            id: 'accounting-truth-available',
            severity: 'low',
          }),
          expect.objectContaining({
            id: 'balance-sheet-not-balanced',
            severity: 'high',
          }),
          expect.objectContaining({
            id: 'vat-position-present',
            severity: 'low',
          }),
        ]),
      }),
    );
  });

  it('does not include another company totals in dashboard stats', async () => {
    const { user, token } = await createRoleSession('accountant');
    const otherSession = await createRoleSession('accountant');

    await createInvoiceFor(user, {
      invoiceNumber: 'DASH-A-001',
      subtotal: 100,
      amount: 119,
      total: 119,
    });

    await createInvoiceFor(otherSession.user, {
      invoiceNumber: 'DASH-B-001',
      subtotal: 1000,
      amount: 1190,
      total: 1190,
    });

    const response = await requestFor({
      token,
      companyId: user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.companyId).toBe(user.companyId);
    expect(response.body.stats.totalRevenue).toBe(119);
    expect(response.body.invoiceStats.totalRevenue).toBe(119);
  });

  it('rejects unauthenticated dashboard stats access', async () => {
    const response = await requestFor({
      headers: { 'x-company-id': '1' },
    });

    expect(response.status).toBe(401);
  });

  it('requires company context', async () => {
    const { token } = await createRoleSession('accountant');

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/dashboard/stats',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('COMPANY_CONTEXT_REQUIRED');
  });

  it('allows viewer role to read dashboard stats', async () => {
    const { user, token } = await createRoleSession('viewer');

    const response = await requestFor({
      token,
      companyId: user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
