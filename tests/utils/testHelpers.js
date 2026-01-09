/**
 * Create a test expense with all required fields.
 * @param {Object} overrides - Fields to override in the expense.
 * @returns {Promise<Expense>}
 */
const bcrypt = require('bcryptjs');
const { User, Invoice, Company, Expense, sequelize } = require('../../src/models');
const { buildExpensePayload } = require('./buildPayload');
/**
 * Create a test expense with all required fields.
 * @param {Object} overrides - Fields to override in the expense.
 * @returns {Promise<Expense>}
 */
async function createTestExpense(overrides = {}) {
  await assertSequelizeReady();
  const payload = buildExpensePayload(overrides);
  return Expense.create(payload);
}
const jwt = require('jsonwebtoken');

/* =========================
   User & Auth Helpers
========================= */

async function createTestUserAndLogin(overrides = {}) {
  await assertSequelizeReady();
  const user = await createTestUser(overrides);
  const token = jwt.sign(
    { userId: user.id, role: user.role, companyId: user.companyId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' },
  );
  return { user, token };
}

async function createAdminAndLogin() {
  await assertSequelizeReady();
  return createTestUserAndLogin({ role: 'admin' });
}

async function createTestUser(overrides = {}) {
  await assertSequelizeReady();
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: await bcrypt.hash('testpass123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  };

  let user;
  let company;

  // If static email provided, check for existing user
  if (overrides.email) {
    user = await User.findOne({ where: { email: overrides.email } });
    if (user) {
      // Ensure user has a company
      if (!user.companyId) {
        company = await Company.create({
          name: `Test Company ${Date.now()}`,
          taxId: `DE${Math.random().toString().slice(2, 11)}`,
          address: 'Test Address 123',
          city: 'Berlin',
          postalCode: '10115',
          country: 'Germany',
          userId: user.id,
        });
        await user.update({ companyId: company.id });
        await company.update({ userId: user.id });
      } else {
        company = await Company.findByPk(user.companyId);
      }
      // Optionally update password if provided
      if (overrides.password) {
        const hashed = await bcrypt.hash(overrides.password, 10);
        await user.update({ password: hashed });
      }
      return user;
    }
  }

  // Always create/find company first
  if (overrides.companyId) {
    company = await Company.findByPk(overrides.companyId);
    if (!company) {
      company = await Company.create({
        id: overrides.companyId,
        name: `Test Company ${Date.now()}`,
        taxId: `DE${Math.random().toString().slice(2, 11)}`,
        address: 'Test Address 123',
        city: 'Berlin',
        postalCode: '10115',
        country: 'Germany',
        userId: null,
      });
    }
  } else {
    company = await Company.create({
      name: `Test Company ${Date.now()}`,
      taxId: `DE${Math.random().toString().slice(2, 11)}`,
      address: 'Test Address 123',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      userId: null,
    });
  }

  // Now create user, always setting companyId
  user = await User.create({ ...defaultUser, ...overrides, companyId: company.id });

  // Optionally associate user as owner/admin if company has no userId
  if (!company.userId) {
    await company.update({ userId: user.id });
  }

  return user;
}

async function createTestCompany(userIdOrOverrides, overrides = {}) {
  await assertSequelizeReady();
  let userId;
  let companyOverrides = overrides;

  if (
    userIdOrOverrides &&
    typeof userIdOrOverrides === 'object' &&
    !Number.isInteger(userIdOrOverrides)
  ) {
    companyOverrides = userIdOrOverrides;
  } else {
    userId = userIdOrOverrides;
  }

  const defaultCompany = {
    name: `Test Company ${Date.now()}`,
    taxId: `DE${Math.random().toString().slice(2, 11)}`,
    address: 'Test Address 123',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    aiEnabled: typeof companyOverrides.aiEnabled === 'boolean' ? companyOverrides.aiEnabled : true,
    userId,
  };

  return Company.create({ ...defaultCompany, ...companyOverrides });
}

async function createTestInvoice(userId, overrides = {}) {
  await assertSequelizeReady();
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found for invoice creation');
  }

  const now = new Date();

  const defaultInvoice = {
    invoiceNumber: `INV-TEST-${Date.now()}`,
    subtotal: 1000.0,
    total: 1000.0,
    amount: 1000.0,
    currency: 'EUR',
    status: 'SENT',
    date: now,
    dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    clientName: 'Test Client',
    userId,
    companyId: user.companyId,
  };

  return Invoice.create({ ...defaultInvoice, ...overrides });
}

function createAuthToken(userId, companyId) {
  return jwt.sign({ userId, companyId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h',
  });
}

/* =========================
   Database Cleanup (FIX)
========================= */

async function cleanDatabase() {
  await assertSequelizeReady();
  // Destroy order: child/dependent tables first, then User, then Company
  const {
    AuditLog,
    Expense,
    ActiveToken,
    RevokedToken,
    FileAttachment,
    Transaction,
    BankStatement,
    BankTransaction,
    TaxReport,
    AIInsight,
    AIInsightDecision,
    BankStatementImportDryRun,
  } = require('../../src/models');

  // 1. Destroy all child/dependent tables first (strict FK order)
  if (AIInsightDecision) {
    await AIInsightDecision.destroy({ where: {}, force: true });
  }
  if (AIInsight) {
    await AIInsight.destroy({ where: {}, force: true });
  }
  if (AuditLog) {
    await AuditLog.destroy({ where: {}, force: true });
  }
  if (ActiveToken) {
    await ActiveToken.destroy({ where: {}, force: true });
  }
  if (FileAttachment) {
    await FileAttachment.destroy({ where: {}, force: true });
  }
  if (BankTransaction) {
    await BankTransaction.destroy({ where: {}, force: true });
  }
  if (BankStatementImportDryRun) {
    await BankStatementImportDryRun.destroy({ where: {}, force: true });
  }
  if (Invoice) {
    await Invoice.destroy({ where: {}, force: true });
  }
  if (Expense) {
    await Expense.destroy({ where: {}, force: true });
  }
  if (Transaction) {
    await Transaction.destroy({ where: {}, force: true });
  }
  if (BankStatement) {
    await BankStatement.destroy({ where: {}, force: true });
  }
  if (TaxReport) {
    await TaxReport.destroy({ where: {}, force: true });
  }
  // 2. Destroy User before Company
  if (User) {
    await User.destroy({ where: {}, force: true });
  }
  // 3. RevokedToken has no FK, can be deleted after User
  if (RevokedToken) {
    await RevokedToken.destroy({ where: {}, force: true });
  }
  if (Company) {
    await Company.destroy({ where: {}, force: true });
  }
}

// Guard: throw if sequelize is closed
async function assertSequelizeReady() {
  if (!sequelize || typeof sequelize.authenticate !== 'function') {
    throw new Error('Sequelize instance is not available.');
  }
  // Check if connection is closed (Sequelize v6+)
  if (sequelize.connectionManager && sequelize.connectionManager.pool) {
    if (sequelize.connectionManager.pool._closed) {
      throw new Error('Sequelize connection is closed.');
    }
  }
  // Optionally, try a lightweight query to ensure connection is alive
  // await sequelize.authenticate(); // Uncomment if you want a live check
}

/* =========================
   Stripe Mocks
========================= */

function mockStripeCustomer() {
  return {
    id: 'cus_test123',
    email: 'test@example.com',
    data: [
      {
        price: {
          id: 'price_test123',
          recurring: { interval: 'month' },
        },
      },
    ],
  };
}

// =========================
// Unified SystemContext Helper
// =========================
/**
 * Create a fully valid SystemContext for audit logging in tests.
 * @param {Object} opts
 * @param {Object} opts.user - User object
 * @param {Object} opts.company - Company object
 * @param {string} [opts.status='SUCCESS'] - Status for the context (SUCCESS or DENIED)
 * @returns {Object} Valid SystemContext
 */
function createValidSystemContext({ user, company, status = 'SUCCESS' }) {
  return {
    actorType: 'USER',
    actorId: user.id,
    companyId: company.id,
    reason: 'Test execution',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    status,
    scopeType: 'ACCOUNTING',
    eventClass: 'EXPENSE',
  };
}

module.exports = {
  createTestUserAndLogin,
  createAdminAndLogin,
  createTestUser,
  createTestCompany,
  createTestInvoice,
  createAuthToken,
  cleanDatabase,
  mockStripeCustomer,
  assertSequelizeReady,
  createTestExpense,
  createValidSystemContext,
};
