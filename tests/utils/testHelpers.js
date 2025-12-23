const { User, Invoice, Company, sequelize } = require('../../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* =========================
   User & Auth Helpers
========================= */

async function createTestUserAndLogin(overrides = {}) {
  const user = await createTestUser(overrides);
  const token = jwt.sign(
    { userId: user.id, role: user.role, companyId: user.companyId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' },
  );
  return { user, token };
}

async function createAdminAndLogin() {
  return createTestUserAndLogin({ role: 'admin' });
}

async function createTestUser(overrides = {}) {
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

    // Then create company
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
    return user;
  }

  // If companyId provided
  user = await User.create({ ...defaultUser, ...overrides, companyId });
  return user;
}

async function createTestCompany(userId, overrides = {}) {
  const defaultCompany = {
    name: `Test Company ${Date.now()}`,
    taxId: `DE${Math.random().toString().slice(2, 11)}`,
    address: 'Test Address 123',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    userId,
  };

  return Company.create({ ...defaultCompany, ...overrides });
}

async function createTestInvoice(userId, overrides = {}) {
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
    status: 'pending',
    date: now,
    dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    clientName: 'Test Client',
    userId,
    companyId: user.companyId,
  };

  return Invoice.create({ ...defaultInvoice, ...overrides });
}

function createAuthToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}

/* =========================
   Database Cleanup (FIX)
========================= */

async function cleanDatabase() {
  // 🔴 SQLite FK safety for Jest
  await sequelize.query('PRAGMA foreign_keys = OFF');

  await Invoice.destroy({ where: {}, force: true });
  await Company.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });

  await sequelize.query('PRAGMA foreign_keys = ON');
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
};
