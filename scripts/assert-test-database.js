#!/usr/bin/env node
'use strict';

const { QueryTypes } = require('sequelize');
const { getSequelize } = require('../src/config/database');
const {
  assertSafeTestDatabaseTarget,
  parseAllowedDatabaseNames,
} = require('../src/config/testDatabaseSafety');

function fail(error) {
  const message = error && error.message ? error.message : 'Unknown safety preflight failure';
  process.stderr.write(`TEST_DATABASE_IDENTITY=FAIL ${message}\n`);
  process.exit(1);
}

async function run() {
  try {
    assertSafeTestDatabaseTarget();

    const sequelize = getSequelize('test');
    try {
      if (sequelize.getDialect() !== 'postgres') {
        throw new Error('Runtime safety violation: dialect=non-postgres');
      }

      const rows = await sequelize.query(
        'SELECT current_database() AS database_name, current_user AS database_user',
        { type: QueryTypes.SELECT },
      );
      const databaseName = rows[0] && rows[0].database_name ? String(rows[0].database_name) : '';
      const databaseUser = rows[0] && rows[0].database_user ? String(rows[0].database_user) : '';
      const allowedNames = parseAllowedDatabaseNames(process.env.TEST_DATABASE_ALLOWED_NAMES);

      assertSafeTestDatabaseTarget({
        nodeEnv: 'test',
        useSqlite: 'false',
        databaseUrl: `postgres://runtime@runtime/${databaseName}`,
        allowedNames,
      });

      if (String(process.env.NODE_ENV || '').toLowerCase() !== 'test') {
        throw new Error('Runtime safety violation: NODE_ENV is not test');
      }
      if (String(process.env.USE_SQLITE || '').toLowerCase() !== 'false') {
        throw new Error('Runtime safety violation: USE_SQLITE is not false');
      }

      process.stdout.write('TEST_DATABASE_IDENTITY=PASS\n');
      process.stdout.write(`database=${databaseName}\n`);
      process.stdout.write(`user=${databaseUser || 'unknown'}\n`);
      process.stdout.write('dialect=postgres\n');
    } finally {
      await sequelize.close();
    }
  } catch (error) {
    fail(error);
  }
}

run();
