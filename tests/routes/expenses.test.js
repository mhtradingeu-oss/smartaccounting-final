describe('Validation for required fields', () => {
  const baseExpense = {
    vendorName: 'Test Vendor',
    description: 'Test expense',
    category: 'Travel',
    netAmount: 100,
    vatAmount: 19,
    grossAmount: 119,
    vatRate: 0.19,
    expenseDate: new Date().toISOString().slice(0, 10),
    companyId: 1,
    createdByUserId: 1,
    currency: 'EUR',
    status: 'draft',
    source: 'manual',
  };

  [
    'netAmount',
    'vatAmount',
    'grossAmount',
    'vatRate',
    'companyId',
    'createdByUserId',
    'expenseDate',
    'currency',
    'status',
    'source',
    'category',
    'description',
  ].forEach((field) => {
    test(`should 400 if required field ${field} is missing`, async () => {
      const payload = { ...baseExpense };
      delete payload[field];
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/expenses',
        body: payload,
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(new RegExp(field, 'i'));
    });
  });

  test('should 201 for valid payload', async () => {
    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/expenses',
      body: baseExpense,
    });
    expect([200, 201]).toContain(response.status);
    expect(response.body.expense).toHaveProperty('netAmount', 100);
  });
});

describe('Migration/backfill proof for NULL monetary fields', () => {
  test('should backfill NULLs for monetary fields', async () => {
    // Insert an expense row with NULLs directly
    const { Expense } = require('../../src/models');
    const testCompany = await global.testUtils.createTestCompany();
    const testUser = await global.testUtils.createTestUser({ companyId: testCompany.id });
    const rawExpense = await Expense.sequelize.query(
      `INSERT INTO "expenses" ("description", "category", "companyId", "createdByUserId", "expenseDate", "currency", "status", "source")
         VALUES ('Backfill test', 'Travel', ${testCompany.id}, ${testUser.id}, CURRENT_DATE, 'EUR', 'draft', 'manual') RETURNING id;`,
      { type: Expense.sequelize.QueryTypes.INSERT },
    );
    const expenseId = rawExpense[0][0].id;

    // Run the backfill logic (simulate migration)
    // For this test, we call the up() of the migration directly if possible, or re-run the logic
    const migration = require('../../database/migrations/20260110000000-lock-expenses-accountability-and-vat.js');
    await migration.up(Expense.sequelize.getQueryInterface());

    // Reload and check
    const updated = await Expense.findByPk(expenseId);
    expect(updated.netAmount).not.toBeNull();
    expect(updated.vatAmount).not.toBeNull();
    expect(updated.grossAmount).not.toBeNull();
    expect(updated.vatRate).not.toBeNull();
  });
});
const express = require('express');
const expenseRoutes = require('../../src/routes/expenses');
const { Expense, User } = require('../../src/models');

let mockCurrentUser = { id: 1, role: 'admin', companyId: null };
jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: mockCurrentUser.id,
      role: mockCurrentUser.role,
      companyId: mockCurrentUser.companyId,
    };
    req.userId = req.user.id;
    req.companyId = req.user.companyId;
    next();
  },
  requireCompany: (req, res, next) => {
    req.companyId = req.companyId || mockCurrentUser.companyId;
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/expenses', expenseRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Expense Routes', () => {
  let testCompany;
  let testUser;

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    testCompany = await global.testUtils.createTestCompany();
    testUser = await global.testUtils.createTestUser({ companyId: testCompany.id });
    mockCurrentUser = { id: testUser.id, role: testUser.role, companyId: testUser.companyId };
  });

  describe('GET /api/expenses', () => {
    test('should get all expenses', async () => {
      await Expense.create({
        vendorName: 'Test Vendor',
        description: 'Test expense',
        category: 'Travel',
        netAmount: 100,
        vatAmount: 19,
        grossAmount: 119,
        vatRate: 0.19,
        status: 'booked',
        expenseDate: new Date(),
        createdByUserId: testUser.id,
        companyId: testCompany.id,
        currency: 'EUR',
        source: 'manual',
      });
      const response = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/expenses',
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expenses');
      expect(Array.isArray(response.body.expenses)).toBe(true);
    });
  });

  describe('POST /api/expenses', () => {
    test('should create expense', async () => {
      const expenseData = {
        vendorName: 'Test Vendor',
        description: 'Test expense',
        category: 'Travel',
        netAmount: 100,
        vatRate: 0.19,
        expenseDate: new Date().toISOString().slice(0, 10),
        companyId: testCompany.id,
        createdByUserId: testUser.id,
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/expenses',
        body: expenseData,
      });
      expect(response.status).toBe(201);
      expect(response.body.expense).toHaveProperty('vendorName', 'Test Vendor');
      expect(response.body.expense).toHaveProperty('grossAmount');
    });
    test('should validate required fields', async () => {
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/expenses',
        body: { category: 'Travel' },
      });
      expect(response.status).toBe(400);
    });

    test('rejects non-EUR currency', async () => {
      const expenseData = {
        vendorName: 'Test Vendor',
        description: 'Test expense',
        category: 'Travel',
        netAmount: 100,
        vatRate: 0.19,
        expenseDate: new Date().toISOString().slice(0, 10),
        currency: 'USD',
        companyId: testCompany.id,
        createdByUserId: testUser.id,
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/expenses',
        body: expenseData,
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/currency/i);
    });

    test('rejects VAT/gross mismatch', async () => {
      const expenseData = {
        vendorName: 'Test Vendor',
        description: 'Test expense',
        category: 'Travel',
        netAmount: 100,
        vatRate: 0.19,
        vatAmount: 10,
        grossAmount: 110,
        expenseDate: new Date().toISOString().slice(0, 10),
        companyId: testCompany.id,
        createdByUserId: testUser.id,
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/expenses',
        body: expenseData,
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/vatAmount mismatch/i);
    });
  });

  describe('PATCH /api/expenses/:id/status', () => {
    test('should allow valid status transition', async () => {
      const expense = await Expense.create({
        vendorName: 'Test Vendor',
        description: 'Test expense',
        category: 'Travel',
        netAmount: 100,
        vatAmount: 19,
        grossAmount: 119,
        vatRate: 0.19,
        status: 'draft',
        expenseDate: new Date(),
        createdByUserId: testUser.id,
        companyId: testCompany.id,
        currency: 'EUR',
        source: 'manual',
      });
      const patchRes = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked' },
      });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.expense.status).toBe('booked');
    });
    test('should reject invalid status transition', async () => {
      const expense = await Expense.create({
        vendorName: 'Test Vendor',
        description: 'Test expense',
        category: 'Travel',
        netAmount: 100,
        vatAmount: 19,
        grossAmount: 119,
        vatRate: 0.19,
        status: 'draft',
        expenseDate: new Date(),
        createdByUserId: testUser.id,
        companyId: testCompany.id,
        currency: 'EUR',
        source: 'manual',
      });
      const patchRes = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'archived' }, // valid
      });
      expect(patchRes.status).toBe(200);
      const patchRes2 = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'draft' }, // invalid
      });
      expect(patchRes2.status).toBe(404);
    });
  });

  describe('RBAC and cross-company access', () => {
    test('should prevent access to other company expenses', async () => {
      const testHelpers = require('../utils/testHelpers');
      const otherCompany = await testHelpers.createTestCompany();
      const otherUser = await testHelpers.createTestUser({ companyId: otherCompany.id });
      const expense = await Expense.create({
        vendorName: 'Other Vendor',
        description: 'Other company expense',
        category: 'Office',
        netAmount: 50,
        vatAmount: 10,
        grossAmount: 60,
        vatRate: 0.2,
        status: 'draft',
        expenseDate: new Date(),
        createdByUserId: otherUser.id,
        companyId: otherCompany.id,
        currency: 'EUR',
        source: 'manual',
      });
      const response = await global.requestApp({
        app,
        method: 'GET',
        url: `/api/expenses/${expense.id}`,
      });
      expect(response.status).toBe(404);
    });
  });
});
