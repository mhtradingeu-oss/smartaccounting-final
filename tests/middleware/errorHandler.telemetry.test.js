const httpMocks = require('node-mocks-http');
const errorHandler = require('../../src/middleware/errorHandler');

describe('errorHandler telemetry', () => {
  let origEnv;
  let mockTelemetry;
  let origTelemetryReporter;

  beforeEach(() => {
    origEnv = { ...process.env };
    process.env.TELEMETRY_ENABLED = 'true';
    mockTelemetry = { reportError: jest.fn() };
    jest.resetModules();
    // Patch telemetryReporter in errorHandler
    jest.mock('../../src/lib/telemetryReporter', () => mockTelemetry, { virtual: true });
    // Remove cached errorHandler to reload with mock
    delete require.cache[require.resolve('../../src/middleware/errorHandler')];
  });

  afterEach(() => {
    process.env = origEnv;
    jest.resetModules();
  });

  function makeReqRes({ statusCode = 500, id = 'test-req-id' } = {}) {
    const req = httpMocks.createRequest({
      method: 'GET',
      url: '/test',
      headers: { 'x-request-id': id },
    });
    req.id = id;
    const res = httpMocks.createResponse();
    res.setHeader('X-Request-Id', id);
    return { req, res };
  }

  it('triggers telemetry for 5xx errors', () => {
    const { req, res } = makeReqRes({ statusCode: 500 });
    const err = new Error('fail');
    err.statusCode = 500;
    errorHandler(err, req, res, () => {});
    expect(mockTelemetry.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'test-req-id',
        route: '/test',
        method: 'GET',
        statusCode: 500,
      }),
    );
  });

  it('does not trigger telemetry for 4xx errors', () => {
    const { req, res } = makeReqRes({ statusCode: 400 });
    const err = new Error('bad');
    err.statusCode = 400;
    errorHandler(err, req, res, () => {});
    expect(mockTelemetry.reportError).not.toHaveBeenCalled();
  });

  it('preserves requestId in logs and response', () => {
    const { req, res } = makeReqRes({ statusCode: 500, id: 'req-123' });
    const err = new Error('fail');
    err.statusCode = 500;
    let logged;
    const origLogger = require('../../src/lib/logger');
    const fakeLogger = {
      error: jest.fn((msg, payload) => {
        logged = payload;
      }),
      warn: jest.fn(),
    };
    jest.mock('../../src/lib/logger', () => fakeLogger, { virtual: true });
    delete require.cache[require.resolve('../../src/middleware/errorHandler')];
    const freshHandler = require('../../src/middleware/errorHandler');
    freshHandler(err, req, res, () => {});
    expect(res._getData()).toEqual(expect.stringContaining('req-123'));
    expect(logged.requestId).toBe('req-123');
  });
});
