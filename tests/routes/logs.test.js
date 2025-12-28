const request = require('../utils/request');
const express = require('express');
const logger = require('../../src/lib/logger');

jest.mock('../../src/lib/logger');

// 🔴 MOCK BEFORE REQUIRE
jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: jest.fn(),
}));

const { authenticate } = require('../../src/middleware/authMiddleware');
const logsRouter = require('../../src/routes/logs');

function makeApp(authImpl) {
  const app = express();
  app.use(express.json());

  authenticate.mockImplementation(authImpl);

  app.use('/api/logs', logsRouter);
  return app;
}

describe('POST /api/logs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject unauthenticated requests', async () => {
    const app = makeApp((req, res) =>
      res.status(401).json({ error: 'Unauthorized' }),
    );

    const res = await request(app)
      .post('/api/logs')
      .send({ message: 'test' });

    expect(res.status).toBe(401);
  });

  it('should accept valid auth and return success', async () => {
    const app = makeApp((req, _res, next) => {
      req.user = { id: 1, role: 'admin', companyId: 1 };
      req.userId = 1;
      req.companyId = 1;
      next();
    });

    const res = await request(app)
      .post('/api/logs')
      .send({
        message: 'test',
        level: 'info',
        timestamp: '2025-12-16T00:00:00Z',
        url: '/foo',
        context: { foo: 'bar' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('should not log forbidden fields', async () => {
    const app = makeApp((req, _res, next) => {
      req.user = { id: 1, role: 'admin', companyId: 1 };
      req.userId = 1;
      req.companyId = 1;
      next();
    });

    await request(app)
      .post('/api/logs')
      .send({
        message: 'test',
        level: 'info',
        token: 'should-not-log',
        email: 'should@not.log',
        user: 'should-not-log',
        context: {
          foo: 'bar',
          password: 'should-not-log',
          nested: { iban: 'should-not-log', keep: 'ok' },
        },
      });

    const call =
      logger.info.mock.calls[0] ||
      logger.warn.mock.calls[0] ||
      logger.error.mock.calls[0] ||
      logger.debug.mock.calls[0];

    expect(call).toBeDefined();

    const meta = call[1];
    expect(meta).not.toHaveProperty('token');
    expect(meta).not.toHaveProperty('email');
    expect(meta).not.toHaveProperty('user');
    expect(meta.context).not.toHaveProperty('password');
    expect(meta.context.nested).not.toHaveProperty('iban');
    expect(meta.context.nested).toHaveProperty('keep', 'ok');
  });
});
