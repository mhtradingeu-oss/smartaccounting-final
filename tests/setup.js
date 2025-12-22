const httpMocks = require('node-mocks-http');
const { EventEmitter } = require('events');
const { logger } = require('../src/utils/errorHandler');
const { sequelize } = require('../src/models');
const { closeDatabase } = require('../src/lib/database');

// Silence logs
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();
logger.info = jest.fn();
logger.warn = jest.fn();
logger.error = jest.fn();
jest.setTimeout(10000);


process.env.JWT_SECRET = 'test-jwt-secret';
process.env.EMAIL_HOST = 'test.smtp.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'testpass';
process.env.STRIPE_SECRET_KEY = 'test-stripe-key';

process.env.STRIPE_SECRET_KEY = 'test-stripe-key';

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  // Create global test user and token
  const { User } = require('../src/models');
  const jwt = require('jsonwebtoken');
  const bcrypt = require('bcryptjs');
  global.testUser = await User.create({
    email: 'test@example.com',
    password: await bcrypt.hash('testpass123', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  });
  global.testToken = jwt.sign(
    {
      userId: global.testUser.id,
      role: global.testUser.role,
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' },
  );
});

global.requestApp = ({ app, method = 'GET', url = '/', headers = {}, body }) => {
  return new Promise((resolve) => {
    const req = httpMocks.createRequest({ method, url, headers, body });
    req.socket = req.socket || {
      setTimeout: () => {},
    };
    if (typeof req.setTimeout !== 'function') {
      req.setTimeout = function (timeout) {
        if (this.socket && typeof this.socket.setTimeout === 'function') {
          this.socket.setTimeout(timeout);
        }
      };
    }
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

    res.on('end', () => {
      const rawData = res._getData();
      const text =
        typeof rawData === 'string'
          ? rawData
          : Buffer.isBuffer(rawData)
            ? rawData.toString('utf8')
            : rawData;
      let parsedBody = rawData;
      if (typeof text === 'string') {
        try {
          parsedBody = JSON.parse(text);
        } catch {
          parsedBody = rawData;
        }
      }
      const response = {
        status: res.statusCode,
        body: parsedBody,
        text,
      };
      if (typeof res.getHeaders === 'function') {
        response.headers = res.getHeaders();
      }
      resolve(response);
    });

    app.handle(req, res);
  });
};

jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../src/services/stripeService', () => ({
  createCustomer: jest.fn(),
  createSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
}));

afterAll(async () => {
  await closeDatabase();
});

global.testUtils = require('./utils/testHelpers');
