const bcrypt = require('bcryptjs');
const { User, Company, Invoice } = require('../models');

const jwt = require('jsonwebtoken');

const createTestCompany = async (overrides = {}) => {
  const base = {
    name: `Test Company ${Date.now()}`,
    taxId: `DE${Date.now()}${Math.random().toString().slice(2, 7)}`,
    address: 'Test Address',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
  };

  const company = await Company.create({ ...base, ...overrides });
  return company;
};

const createTestUser = async (overrides = {}) => {
  const company = overrides.companyId
    ? await Company.findByPk(overrides.companyId)
    : await createTestCompany();

  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: await bcrypt.hash('testpass123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    companyId: company.id,
  };

  const user = await User.create({ ...defaultUser, ...overrides });

  await company.update({ userId: user.id });
  return user;
};

const createAuthToken = (userId, payload = {}) => {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key';
  return jwt.sign({ userId, ...payload }, secret, { expiresIn: '1h' });
};

const createTestInvoice = async (overrides = {}) => {
  const baseInvoice = {
    invoiceNumber: `INV-${Date.now()}`,
    amount: 1000.0,
    subtotal: 1000.0,
    total: 1000.0,
    currency: 'EUR',
    status: 'pending',
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    clientName: 'Client',
  };

  const invoice = await Invoice.create({ ...baseInvoice, ...overrides });
  return invoice;
};

module.exports = {
  createTestUser,
  createTestCompany,
  createTestInvoice,
  createAuthToken,
};
