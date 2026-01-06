#!/usr/bin/env node
'use strict';

require('dotenv').config();

let sequelize;

try {
  const models = require('../src/models');
  sequelize = models.sequelize || models;
} catch (err) {
  console.error('[MIGRATION-READINESS] Failed to load sequelize instance');
  console.error(err.message);
  process.exit(1);
}

const sqliteRequested = process.env.USE_SQLITE === 'true';

function logDbMode() {
  const dialect = sequelize.getDialect();
  console.log(`[MIGRATION-READINESS] Database dialect: ${dialect}`);

  if (sqliteRequested && dialect !== 'sqlite') {
    throw new Error(`USE_SQLITE=true requires sqlite dialect, but detected "${dialect}"`);
  }
}

async function verifyTables() {
  const qi = sequelize.getQueryInterface();
  const tables = await qi.showAllTables();

  if (!Array.isArray(tables) || tables.length === 0) {
    throw new Error('No database tables found — migrations may not have run');
  }

  console.log(`[MIGRATION-READINESS] Tables discovered: ${tables.length}`);

  const requiredTables = [
    'companies',
    'users',
    'invoices',
    'expenses',
    'transactions',
    'audit_logs',
  ];

  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name));

  const missing = requiredTables.filter((t) => !normalized.includes(t));

  if (missing.length > 0) {
    throw new Error(`Missing required tables: ${missing.join(', ')}`);
  }

  console.log('[MIGRATION-READINESS] Core tables verified');
}

async function main() {
  console.log('[MIGRATION-READINESS] Starting migration readiness check...');

  try {
    logDbMode();
    await sequelize.authenticate();
    console.log('[MIGRATION-READINESS] Database connection authenticated');

    await verifyTables();

    console.log('[MIGRATION-READINESS] ✅ Migration readiness check PASSED');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION-READINESS] ❌ Migration readiness check FAILED');
    console.error('[MIGRATION-READINESS]', error.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
      console.log('[MIGRATION-READINESS] Database connection closed');
    } catch (closeError) {
      console.warn(
        '[MIGRATION-READINESS] Failed to close database connection:',
        closeError.message,
      );
    }
  }
}

main();
