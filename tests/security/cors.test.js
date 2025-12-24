const originalEnv = { ...process.env };

function restoreEnv() {
  Object.keys(process.env).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(originalEnv, key)) {
      delete process.env[key];
    }
  });
  Object.entries(originalEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

describe('CORS middleware configuration', () => {
  afterEach(() => {
    restoreEnv();
    jest.resetModules();
  });

  it('builds the allowlist from env values and rejects other origins', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://app.smartaccounting.test';
    process.env.CLIENT_URL = 'https://client.smartaccounting.test';
    process.env.CORS_ORIGIN = 'https://custom.smartaccounting.test';

    jest.resetModules();
    const corsMiddleware = require('../../src/middleware/cors');

    const expectedOrigins = [
      'https://app.smartaccounting.test',
      'https://client.smartaccounting.test',
      'https://custom.smartaccounting.test',
    ].sort();
    const actualOrigins = Array.from(corsMiddleware.allowedOrigins).sort();
    expect(actualOrigins).toEqual(expectedOrigins);

    const successCallback = jest.fn();
    corsMiddleware.corsOptions.origin('https://client.smartaccounting.test', successCallback);
    expect(successCallback).toHaveBeenCalledWith(null, true);
    successCallback.mockReset();

    corsMiddleware.corsOptions.origin('https://evil.com', successCallback);
    expect(successCallback).toHaveBeenCalledWith(null, false);

    expect(corsMiddleware.corsOptions.credentials).toBe(false);
  });

  it('only exposes the least-privilege methods and headers', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://app.smartaccounting.test';
    process.env.CLIENT_URL = 'https://client.smartaccounting.test';
    process.env.CORS_ORIGIN = 'https://custom.smartaccounting.test';

    jest.resetModules();
    const corsMiddleware = require('../../src/middleware/cors');

    expect(corsMiddleware.corsOptions.methods).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]);
    expect(corsMiddleware.corsOptions.allowedHeaders).toEqual([
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-CSRF-Token',
      'X-Request-Id',
    ]);
  });
});
