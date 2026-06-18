process.env.API_BASE_URL = '/api';

const app = require('../../src/app');
const { AuditLog, Expense } = require('../../src/models');
const buildSystemContext = require('../utils/buildSystemContext');
const { buildExpensePayload } = require('../utils/buildPayload');

const roles = ['admin', 'accountant', 'auditor', 'viewer'];
const writeRoles = ['admin', 'accountant'];
const readOnlyRoles = ['auditor', 'viewer'];

const authHeaders = ({ token, companyId }) => ({
  Authorization: `Bearer ${token}`,
  'x-company-id': companyId,
});

const requestFor = ({ method = 'get', url = '/api/expenses', token, companyId, body }) =>
  global.requestApp({
    app,
    method,
    url,
    headers: authHeaders({ token, companyId }),
    body,
  });

const createRoleSession = (role, companyId = global.testCompany.id) =>
  global.testUtils.createTestUserAndLogin({
    role,
    companyId,
    email: `expenses-${role}-${Date.now()}-${Math.random()}@example.com`,
  });

const payloadFor = (user, overrides = {}) =>
  buildExpensePayload({
    companyId: user.companyId,
    createdByUserId: user.id,
    userId: user.id,
    status: 'pending',
    ...overrides,
  });

const createPayloadFor = (user, overrides = {}) => ({
  companyId: user.companyId,
  createdByUserId: user.id,
  expenseDate: new Date().toISOString().slice(0, 10),
  currency: 'EUR',
  status: 'pending',
  source: 'manual',
  category: 'Travel',
  description: 'Test expense',
  vendorName: 'Test Vendor',
  netAmount: 100,
  vatRate: 0.19,
  vatAmount: 19,
  grossAmount: 119,
  ...overrides,
});

const createExpenseFor = (user, overrides = {}) => Expense.create(payloadFor(user, overrides));

beforeEach(async () => {
  await AuditLog.destroy({ where: {} });
  await Expense.destroy({ where: {} });
});

describe('Expenses API', () => {
  describe('read access', () => {
    it.each(roles)('%s can list and get expenses', async (role) => {
      const { user, token } = await createRoleSession(role);
      const expense = await createExpenseFor(user, { description: `${role} expense` });

      const listRes = await requestFor({
        token,
        companyId: user.companyId,
      });
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.expenses)).toBe(true);
      expect(listRes.body.expenses.some((item) => item.id === expense.id)).toBe(true);

      const getRes = await requestFor({
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}`,
      });
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.expense.id).toBe(expense.id);
      expect(getRes.body.expense.status).toBe('pending');
    });
  });

  describe('create access', () => {
    it.each(writeRoles)('%s can create expenses with audit log', async (role) => {
      const { user, token } = await createRoleSession(role);

      const res = await requestFor({
        method: 'post',
        token,
        companyId: user.companyId,
        body: {
          ...createPayloadFor(user, { description: `${role} created expense` }),
          systemContext: buildSystemContext({ user }),
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.expense.status).toBe('pending');
      expect(res.body.expense.currency).toBe('EUR');

      const auditEntry = await AuditLog.findOne({
        where: { resourceType: 'Expense', resourceId: String(res.body.expense.id) },
      });
      expect(auditEntry).toBeTruthy();
      expect(auditEntry.immutable).toBe(true);
    });

    it.each(readOnlyRoles)('%s cannot create expenses', async (role) => {
      const { user, token } = await createRoleSession(role);

      const res = await requestFor({
        method: 'post',
        token,
        companyId: user.companyId,
        body: payloadFor(user),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('status changes', () => {
    it.each(writeRoles)('%s can change allowed expense status transitions', async (role) => {
      const { user, token } = await createRoleSession(role);
      const expense = await createExpenseFor(user, { status: 'pending' });

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked', systemContext: buildSystemContext({ user }) },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.expense.status).toBe('booked');
    });

    it.each(readOnlyRoles)('%s cannot change expense status', async (role) => {
      const owner = await createRoleSession('admin');
      const expense = await createExpenseFor(owner.user, { status: 'pending' });
      const { user, token } = await createRoleSession(role, owner.user.companyId);

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked' },
      });

      expect(res.status).toBe(403);
    });

    it('rejects invalid transitions with 409', async () => {
      const { user, token } = await createRoleSession('admin');
      const expense = await createExpenseFor(user, { status: 'archived' });

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked' },
      });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });

    it('normalizes legacy pending statuses during transitions', async () => {
      const { user, token } = await createRoleSession('admin');
      const expense = await createExpenseFor(user, { status: 'PENDING' });

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked' },
      });

      expect(res.status).toBe(200);
      expect(res.body.expense.status).toBe('booked');
    });
  });

  it('denies cross-company expense access', async () => {
    const owner = await createRoleSession('admin');
    const otherCompany = await global.testUtils.createTestCompany();
    const outsider = await createRoleSession('admin', otherCompany.id);
    const expense = await createExpenseFor(owner.user);

    const res = await requestFor({
      token: outsider.token,
      companyId: outsider.user.companyId,
      url: `/api/expenses/${expense.id}`,
    });

    expect(res.status).toBe(404);
  });

  it('enforces EUR currency integrity', async () => {
    const { user, token } = await createRoleSession('admin');

    const res = await requestFor({
      method: 'post',
      token,
      companyId: user.companyId,
      body: createPayloadFor(user, { currency: 'USD' }),
    });

    expect(res.status).toBe(400);
  });

  it('enforces VAT total integrity', async () => {
    const { user, token } = await createRoleSession('admin');

    const res = await requestFor({
      method: 'post',
      token,
      companyId: user.companyId,
      body: createPayloadFor(user, { vatAmount: 1, grossAmount: 101 }),
    });

    expect(res.status).toBe(400);
  });
});
