'use strict';

const { createDatabaseConfig } = require('../../src/config/database');

const TRACKED_ENV_KEYS = ['NODE_ENV', 'USE_SQLITE', 'DATABASE_URL', 'TEST_DATABASE_ALLOWED_NAMES'];

function snapshotEnv() {
  return TRACKED_ENV_KEYS.reduce((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});
}

function restoreEnv(snapshot) {
  TRACKED_ENV_KEYS.forEach((key) => {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  });
}

describe('createDatabaseConfig safety integration behavior', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = snapshotEnv();
    delete global.__SEQUELIZE_SINGLETON__;
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    delete global.__SEQUELIZE_SINGLETON__;
  });

  test('rejects development PostgreSQL URL in test mode', () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE = 'false';
    process.env.DATABASE_URL = 'postgres://smart:smartpass@db:5432/smartaccounting';
    process.env.TEST_DATABASE_ALLOWED_NAMES = 'smartaccounting_test,smartaccounting';

    expect(() => createDatabaseConfig('test')).toThrow(/TEST_DATABASE_SAFETY_VIOLATION|safety/i);
  });

  test('accepts smartaccounting_test PostgreSQL URL in test mode', () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_SQLITE = 'false';
    process.env.DATABASE_URL = 'postgres://postgres:postgres@db:5432/smartaccounting_test';
    process.env.TEST_DATABASE_ALLOWED_NAMES = 'smartaccounting_test';

    const config = createDatabaseConfig('test');

    expect(config.env).toBe('test');
    expect(config.isSqlite).toBeFalsy();
    expect(config.databaseUrl).toBe('postgres://postgres:postgres@db:5432/smartaccounting_test');
  });
});
