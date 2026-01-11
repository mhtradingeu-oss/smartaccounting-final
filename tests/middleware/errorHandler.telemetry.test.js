const httpMocks = require('node-mocks-http');

// Define makeReqRes once at top-level
function makeReqRes({ statusCode = 500, id = 'test-req-id' } = {}) {
  const req = httpMocks.createRequest({
    method: 'GET',
    url: '/test',
    headers: { 'x-request-id': id },
  });
  req.requestId = id;

  const res = httpMocks.createResponse();
  res.setHeader('X-Request-Id', id);
  return { req, res };
}

describe('errorHandler telemetry', () => {
  let origEnv;

  beforeEach(() => {
    jest.resetModules();
    origEnv = { ...process.env };
    process.env.TELEMETRY_ENABLED = 'true';
  });

  afterEach(() => {
    process.env = origEnv;
    jest.resetModules();
  });

  it('triggers telemetry and logs for 5xx errors', () => {
    const mockReportError = jest.fn();
    let loggedLevel = null;

    jest.doMock('../../src/services/telemetry', () => ({
      reportError: mockReportError,
    }));

    jest.doMock('../../src/lib/logger', () => ({
      error: jest.fn(() => {
        loggedLevel = 'error';
      }),
      warn: jest.fn(() => {
        loggedLevel = 'warn';
      }),
      info: jest.fn(),
    }));

    const errorHandler = require('../../src/middleware/errorHandler');
    const { req, res } = makeReqRes({ statusCode: 500 });

    const err = new Error('fail');
    err.statusCode = 500;

    errorHandler(err, req, res, () => {});

    expect(mockReportError).toHaveBeenCalled();
    expect(loggedLevel).toBe('error');
  });

  it('does not trigger telemetry for 4xx errors', () => {
    const mockReportError = jest.fn();
    let loggedLevel = null;

    jest.doMock('../../src/lib/telemetryReporter', () => ({
      reportError: mockReportError,
    }));

    jest.doMock('../../src/lib/logger', () => ({
      error: jest.fn(() => {
        loggedLevel = 'error';
      }),
      warn: jest.fn(() => {
        loggedLevel = 'warn';
      }),
      info: jest.fn(),
    }));

    const errorHandler = require('../../src/middleware/errorHandler');
    const { req, res } = makeReqRes({ statusCode: 400 });

    const err = new Error('bad');
    err.statusCode = 400;

    errorHandler(err, req, res, () => {});

    expect(mockReportError).not.toHaveBeenCalled();
    expect(loggedLevel).toBe('warn');
  });
});

// --- Phase 10: requestId preservation ---
describe('errorHandler telemetry (Phase 10 sealed)', () => {
  let logged;

  beforeEach(() => {
    jest.resetModules();
    logged = undefined;

    jest.doMock('../../src/lib/logger', () => ({
      error: jest.fn((msg, payload) => {
        logged = payload;
      }),
      warn: jest.fn((msg, payload) => {
        logged = payload;
      }),
      info: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('preserves requestId in logs and response', () => {
    const { req, res } = makeReqRes({ statusCode: 500, id: 'req-123' });

    const err = new Error('fail');
    err.statusCode = 500;

    const errorHandler = require('../../src/middleware/errorHandler');
    errorHandler(err, req, res, () => {});

    expect(res._getData()).toEqual(expect.stringContaining('req-123'));

    if (logged) {
      expect(logged.requestId).toBe('req-123');
    }
  });
});
