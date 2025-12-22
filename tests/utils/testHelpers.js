
const { User, Invoice, Company } = require('../../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function createTestUserAndLogin(overrides = {}) {
  const user = await createTestUser(overrides);
  const token = jwt.sign({ userId: user.id, role: user.role, companyId: user.companyId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  return { user, token };
}

async function createAdminAndLogin() {
  return createTestUserAndLogin({ role: 'admin' });
}

async function createTestUser(overrides = {}) {
  const companyId = overrides.companyId;
  let user;
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: await bcrypt.hash('testpass123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  };
  if (!companyId) {
    // Create user first, then company, then update user with companyId
    user = await User.create({ ...defaultUser, ...overrides });
    const company = await Company.create({
      name: `Test Company ${Date.now()}`,
      taxId: `DE${Math.random().toString().slice(2, 11)}`,
      address: 'Test Address 123',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      userId: user.id,
    });
    await user.update({ companyId: company.id });
    return user;
  } else {
    // If companyId provided, create user with it
    user = await User.create({ ...defaultUser, ...overrides, companyId });
    return user;
  }
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
  return await Company.create({ ...defaultCompany, ...overrides });
}

async function createTestInvoice(userId, overrides = {}) {
  // Find user to get companyId
  const user = await User.findByPk(userId);
  if (!user) {throw new Error('User not found for invoice creation');}
  const now = new Date();
  const defaultInvoice = {
    invoiceNumber: `INV-TEST-${Date.now()}`,
    subtotal: 1000.00,
    total: 1000.00,
    amount: 1000.00,
    currency: 'EUR',
    status: 'pending',
    date: now,
    dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    clientName: 'Test Client',
    userId,
    companyId: user.companyId,
  };
  return await Invoice.create({ ...defaultInvoice, ...overrides });
}

function createAuthToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h',
  });
}

async function cleanDatabase() {
  // Clean up test data in correct order (respecting foreign keys)
  await Invoice.destroy({ where: {}, force: true });
  await Company.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
}

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
      data: [{
        price: {
          id: 'price_test123',
          recurring: { interval: 'month' },
        },
      }],
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
