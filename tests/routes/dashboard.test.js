process.env.API_BASE_URL = '/api';

const app = require('../../src/app');
const { Company, Expense, Invoice, User, sequelize } = require('../../src/models');
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

describe('Dashboard stats API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
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
