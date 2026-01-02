const httpMocks = require('node-mocks-http');
const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Force SQLite in test environment and ignore DATABASE_URL
process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = 'true';
delete process.env.DATABASE_URL;
const { sequelize } = require('../src/lib/database');

// ===============================
// Silence logs globally in tests
// ===============================
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

jest.setTimeout(10000);

// ===============================
// Required env vars for tests
// ===============================
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.EMAIL_HOST = 'test.smtp.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpass';
process.env.STRIPE_SECRET_KEY = 'test-stripe-key';

// ===============================
// Global test setup
// ===============================

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  const { AuditLog, User, Company } = require('../src/models');
  // Create test company first
  global.testCompany = await Company.create({
    name: 'Test Company',
    taxId: 'DE000000001',
    address: 'Test Address 123',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    aiEnabled: true,
  });
  // Create test user with correct companyId
  global.testUser = await User.create({
    email: 'test@example.com',
    password: await bcrypt.hash('testpass123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isAnonymized: false,
    companyId: global.testCompany.id,
  });
  // Now create an AuditLog record using the real testUser and testCompany
  try {
    await AuditLog.create({
      action: 'test',
      resourceType: 'test',
      resourceId: '1',
      oldValues: {},
      newValues: {},
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date(),
      userId: global.testUser.id,
      companyId: global.testCompany.id,
      reason: 'system',
      hash: '',
      previousHash: null,
      immutable: true,
    });
  } catch (err) {
    // Fail fast if audit_logs table is missing
    throw new Error('AuditLog.create failed: ' + err.message);
  }
  global.testToken = jwt.sign(
    {
      userId: global.testUser.id,
      companyId: global.testCompany.id,
      role: global.testUser.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
});

afterAll(async () => {
  await sequelize.close();
});

// ===============================
// Helper to invoke Express app
// (NO server.listen, NO ports)
// ===============================
global.requestApp = ({ app, method = 'GET', url = '/', headers = {}, body }) => {
  return new Promise((resolve) => {
    const req = httpMocks.createRequest({
      method,
      url,
      headers,
      body,
    });

    req.socket = req.socket || { setTimeout: () => {} };
    req.setTimeout = () => {};

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    res.on('end', () => {
      const raw = res._getData();
      let parsed = raw;

      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
      }
      const status = res.statusCode;
      resolve({ req, res, status, body: parsed });
    });
    app(req, res);
  });
};

// ===============================
// Test helpers
// ===============================
global.testUtils = require('./utils/testHelpers');

// ===============================
// Teardown: Close sequelize after all tests
// ===============================
