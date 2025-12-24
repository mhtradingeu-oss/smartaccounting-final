const validateEnvironment = require('../../src/utils/validateEnv');
const logger = require('../../src/lib/logger');

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

function setProductionEnv(overrides = {}) {
  process.env.NODE_ENV = 'production';
  process.env.PORT = '4000';
  process.env.DATABASE_URL = 'postgres://user:pass@localhost/test';
  process.env.JWT_SECRET = 'a'.repeat(64);
  process.env.FRONTEND_URL = 'https://app.smartaccounting.test';
  process.env.CLIENT_URL = 'https://client.smartaccounting.test';
  process.env.CORS_ORIGIN = 'https://cors.smartaccounting.test';
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

describe('Environment validation', () => {
  afterEach(() => {
    restoreEnv();
    jest.resetModules();
    logger.error.mockClear();
  });

  it('fails when production secrets still use placeholders', () => {
    setProductionEnv({
      JWT_SECRET: 'replace-with-a-secure-secret',
    });

    expect(() => validateEnvironment()).toThrow('Required environment validation failed');
    expect(logger.error).toHaveBeenCalledWith(
      'JWT_SECRET must be replaced with a secure secret in production',
    );
  });

  it('requires valid https URLs/origins in production', () => {
    setProductionEnv({
      FRONTEND_URL: 'ftp://invalid-url',
      CLIENT_URL: '',
      CORS_ORIGIN: '',
    });

    expect(() => validateEnvironment()).toThrow('Required environment validation failed');
    expect(logger.error).toHaveBeenCalledWith('FRONTEND_URL must be a valid http(s) URL');
    expect(logger.error).toHaveBeenCalledWith('CLIENT_URL is required in production');
    expect(logger.error).toHaveBeenCalledWith('CORS_ORIGIN is required in production');
  });
});
