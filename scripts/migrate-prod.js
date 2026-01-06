#!/usr/bin/env node
'use strict';

/**
 * scripts/migrate-prod.js
 * Production-safe migration runner with verification
 */

const { spawnSync } = require('child_process');
const { QueryTypes } = require('sequelize');
const validateEnvironment = require('../src/utils/validateEnv');

// 🔑 SINGLE SOURCE OF TRUTH
const { sequelize } = require('../src/models');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const REQUIRED_MIGRATIONS = [
  '20251228000100-create-transactions.js',
  '20251228000200-update-tax-reports-schema.js',
  '20251228000300-extend-bank-transactions.js',
  '20251228000400-add-ai-enabled-to-companies.js',
  '20260105000000-create-ai-insight-decisions.js',
  '20260106000000-add-audit-log-immutable.js',
];

function logContext() {
  console.log('[migrate:prod] Environment context:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  Dialect:', sequelize.getDialect());
  console.log(
    '  Database:',
    process.env.POSTGRES_DB || process.env.DB_NAME || process.env.PGDATABASE || '(sqlite)',
  );
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`[migrate:prod] Failed to run ${command}`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

async function verifySequelizeMeta() {
  const dialect = sequelize.getDialect();

  if (dialect === 'sqlite') {
    console.log('[migrate:prod] SQLite detected → skipping SequelizeMeta strict verification');
    return;
  }

  const rows = await sequelize.query('SELECT name FROM "SequelizeMeta" WHERE name IN (:names);', {
    type: QueryTypes.SELECT,
    replacements: { names: REQUIRED_MIGRATIONS },
  });

  const applied = rows.map((row) => row.name);
  const missing = REQUIRED_MIGRATIONS.filter((name) => !applied.includes(name));

  if (missing.length > 0) {
    throw new Error(`[migrate:prod] Missing required migrations: ${missing.join(', ')}`);
  }

  console.log('[migrate:prod] SequelizeMeta verification passed.');
}

async function main() {
  try {
    console.log('[migrate:prod] Validating environment...');
    validateEnvironment();

    logContext();

    console.log('[migrate:prod] Running Sequelize migrations...');
    runCommand('npx', ['sequelize-cli', 'db:migrate']);

    console.log('[migrate:prod] Migrations completed.');

    await verifySequelizeMeta();
  } catch (error) {
    console.error('[migrate:prod] FAILED:', error.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (err) {
      console.error('[migrate:prod] Failed to close DB:', err.message);
    }
  }
}

main();
