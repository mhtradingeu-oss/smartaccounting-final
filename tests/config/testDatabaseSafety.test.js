'use strict';

const {
  parseAllowedDatabaseNames,
  assertSafeTestDatabaseTarget,
} = require('../../src/config/testDatabaseSafety');

function buildOptions(overrides = {}) {
  return {
    nodeEnv: 'test',
    useSqlite: 'false',
    databaseUrl: 'postgres://postgres:secret@db:5432/smartaccounting_test',
    allowedNames: 'smartaccounting_test',
    ...overrides,
  };
}

function expectSafetyViolation(overrides = {}) {
  let caught;
  try {
    assertSafeTestDatabaseTarget(buildOptions(overrides));
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(Error);
  expect(caught.name).toBe('TestDatabaseSafetyError');
  expect(caught.code).toBe('TEST_DATABASE_SAFETY_VIOLATION');
  return caught;
}

describe('test database safety guard', () => {
  test('SQLite test mode skips guard', () => {
    expect(
      assertSafeTestDatabaseTarget(
        buildOptions({
          useSqlite: 'true',
          databaseUrl: undefined,
          allowedNames: undefined,
        }),
      ),
    ).toMatchObject({ applicable: false, passed: true });
  });

  test('development mode does not trigger test guard', () => {
    expect(
      assertSafeTestDatabaseTarget(
        buildOptions({
          nodeEnv: 'development',
          databaseUrl: undefined,
          allowedNames: undefined,
        }),
      ),
    ).toMatchObject({ applicable: false, passed: true });
  });

  test('production mode does not trigger test guard', () => {
    expect(
      assertSafeTestDatabaseTarget(
        buildOptions({
          nodeEnv: 'production',
          databaseUrl: undefined,
          allowedNames: undefined,
        }),
      ),
    ).toMatchObject({ applicable: false, passed: true });
  });

  test('allowed postgres smartaccounting_test passes', () => {
    expect(assertSafeTestDatabaseTarget(buildOptions())).toMatchObject({
      applicable: true,
      passed: true,
      protocol: 'postgres',
      databaseName: 'smartaccounting_test',
    });
  });

  test('postgresql protocol passes', () => {
    expect(
      assertSafeTestDatabaseTarget(
        buildOptions({ databaseUrl: 'postgresql://postgres:secret@db:5432/smartaccounting_test' }),
      ),
    ).toMatchObject({
      applicable: true,
      passed: true,
      protocol: 'postgresql',
      databaseName: 'smartaccounting_test',
    });
  });

  test('comma-separated allowlist parsing trims and deduplicates names', () => {
    expect(
      parseAllowedDatabaseNames(' smartaccounting_test, smartaccounting_test,alt_test , alt_test '),
    ).toEqual(['smartaccounting_test', 'alt_test']);
  });

  test('missing DATABASE_URL fails', () => {
    expectSafetyViolation({ databaseUrl: undefined });
  });

  test('invalid URL fails', () => {
    expectSafetyViolation({ databaseUrl: '::not-a-url::' });
  });

  test('missing database name fails', () => {
    expectSafetyViolation({ databaseUrl: 'postgres://postgres:secret@db:5432' });
  });

  test('mysql URL fails', () => {
    expectSafetyViolation({ databaseUrl: 'mysql://postgres:secret@db:3306/smartaccounting_test' });
  });

  test('sqlite URL in PostgreSQL test mode fails', () => {
    expectSafetyViolation({ databaseUrl: 'sqlite::memory:' });
  });

  test('missing allowlist fails', () => {
    expectSafetyViolation({ allowedNames: undefined });
  });

  test('empty allowlist fails', () => {
    expectSafetyViolation({ allowedNames: ' ,  ' });
  });

  test('smartaccounting rejected', () => {
    expectSafetyViolation({
      databaseUrl: 'postgres://postgres:secret@db:5432/smartaccounting',
      allowedNames: 'smartaccounting_test,smartaccounting',
    });
  });

  test('postgres rejected', () => {
    expectSafetyViolation({
      databaseUrl: 'postgres://postgres:secret@db:5432/postgres',
      allowedNames: 'smartaccounting_test,postgres',
    });
  });

  test('template0 rejected', () => {
    expectSafetyViolation({
      databaseUrl: 'postgres://postgres:secret@db:5432/template0',
      allowedNames: 'smartaccounting_test,template0',
    });
  });

  test('template1 rejected', () => {
    expectSafetyViolation({
      databaseUrl: 'postgres://postgres:secret@db:5432/template1',
      allowedNames: 'smartaccounting_test,template1',
    });
  });

  test('production-like name rejected', () => {
    expectSafetyViolation({
      databaseUrl: 'postgres://postgres:secret@db:5432/smartaccounting_production',
      allowedNames: 'smartaccounting_test,smartaccounting_production',
    });
  });

  test('database not in allowlist rejected', () => {
    expectSafetyViolation({
      databaseUrl: 'postgres://postgres:secret@db:5432/other_test_db',
      allowedNames: 'smartaccounting_test',
    });
  });

  test('error output does not contain password', () => {
    const error = expectSafetyViolation({
      databaseUrl: 'postgres://postgres:super-secret@db:5432/other_test_db',
      allowedNames: 'smartaccounting_test',
    });
    expect(error.message).not.toContain('super-secret');
  });

  test('error output does not contain full DATABASE_URL', () => {
    const fullUrl = 'postgres://postgres:super-secret@db:5432/other_test_db';
    const error = expectSafetyViolation({
      databaseUrl: fullUrl,
      allowedNames: 'smartaccounting_test',
    });
    expect(error.message).not.toContain(fullUrl);
  });
});
