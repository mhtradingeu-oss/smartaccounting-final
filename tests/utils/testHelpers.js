const { User, Invoice, Company, sequelize } = require('../../src/models');
const bcrypt = require('bcryptjs');
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
  const companyId = overrides.companyId;

  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: await bcrypt.hash('testpass123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  };

  let user;

  if (!companyId) {
    // Create user first
    user = await User.create({ ...defaultUser, ...overrides });

    // Then create company and associate user as owner
    const company = await Company.create({
      name: `Test Company ${Date.now()}`,
      taxId: `DE${Math.random().toString().slice(2, 11)}`,
      address: 'Test Address 123',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      userId: user.id,
    });

    // Update user with companyId
    await user.update({ companyId: company.id });
    // Ensure company references user as owner/admin if not already
    await company.update({ userId: user.id });
    return user;
  }

  // If companyId provided, ensure company exists
  let company = await Company.findByPk(companyId);
  if (!company) {
    company = await Company.create({
      id: companyId,
      name: `Test Company ${Date.now()}`,
      taxId: `DE${Math.random().toString().slice(2, 11)}`,
      address: 'Test Address 123',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      userId: null,
    });
  }
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
    created: Math.floor(Date.now() / 1000),
    subscriptions: {
      data: [],
    },
  };
}

function mockStripeSubscription() {
  return {
    id: 'sub_test123',
    customer: 'cus_test123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
    items: {
      data: [
        {
          price: {
            id: 'price_test123',
            recurring: { interval: 'month' },
          },
        },
      ],
    },
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
  mockStripeSubscription,
  assertSequelizeReady,
};
