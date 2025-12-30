#!/usr/bin/env node
const { spawnSync } = require('child_process');
const { QueryTypes } = require('sequelize');
const validateEnvironment = require('../src/utils/validateEnv');
const { sequelize } = require('../src/lib/database');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const REQUIRED_MIGRATIONS = [
  '20251228000100-create-transactions.js',
  '20251228000200-update-tax-reports-schema.js',
  '20251228000300-extend-bank-transactions.js',
  '20251228000400-add-ai-enabled-to-companies.js',
  '20260105000000-create-ai-insight-decisions.js',
  '20260106000000-add-audit-log-immutable.js',
];

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`Failed to run ${command} ${args.join(' ')}`, result.error);
    process.exit(result.status || 1);
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

async function verifySequelizeMeta() {
  const rows = await sequelize.query(
    'SELECT name FROM "SequelizeMeta" WHERE name IN (:names);',
    {
      type: QueryTypes.SELECT,
      replacements: { names: REQUIRED_MIGRATIONS },
    },
  );
  const applied = rows.map((row) => row.name);
  const missing = REQUIRED_MIGRATIONS.filter((name) => !applied.includes(name));
  if (missing.length > 0) {
    throw new Error(`Missing SequelizeMeta entries: ${missing.join(', ')}`);
  }
  console.log('[migrate:prod] SequelizeMeta contains expected migrations.');
}

async function main() {
  try {
    console.log('[migrate:prod] validating environment...');
    validateEnvironment();
  } catch (error) {
    console.error('[migrate:prod] environment validation failed:', error.message);
    process.exit(1);
  }

  console.log('[migrate:prod] running Sequelize migrations (production)...');
  runCommand('npx', ['sequelize-cli', 'db:migrate']);
  console.log('[migrate:prod] migrations completed.');

  try {
    await verifySequelizeMeta();
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('[migrate:prod] failed during verification:', error.message);
  process.exit(1);
});
