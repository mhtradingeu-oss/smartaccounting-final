#!/usr/bin/env node
'use strict';

require('dotenv').config();

let sequelize;

try {
  // Ensure models are initialized
  const models = require('../src/models');
  sequelize = models.sequelize || models;
} catch (err) {
  console.error('[AUTH-READINESS] Failed to load sequelize instance');
  console.error(err.message);
  process.exit(1);
}

const sqliteRequested = process.env.USE_SQLITE === 'true';

function logDbMode() {
  const dialect = sequelize.getDialect();
  console.log(`[AUTH-READINESS] Database dialect: ${dialect}`);

  if (sqliteRequested && dialect !== 'sqlite') {
    throw new Error(`USE_SQLITE=true requires sqlite dialect, but detected "${dialect}"`);
  }
}

function ensureJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be defined for authentication to work');
  }

  if (jwtSecret.length < 16) {
    console.warn('[AUTH-READINESS] Warning: JWT_SECRET is shorter than recommended (>=16 chars)');
  }

  console.log(`[AUTH-READINESS] JWT secret configured (length: ${jwtSecret.length})`);
}

async function main() {
  console.log('[AUTH-READINESS] Starting authentication readiness check...');

  try {
    logDbMode();
    ensureJwtSecret();

    await sequelize.authenticate();
    console.log('[AUTH-READINESS] Database connection authenticated');

    console.log('[AUTH-READINESS] ✅ Auth readiness check PASSED');
    process.exit(0);
  } catch (error) {
    console.error('[AUTH-READINESS] ❌ Auth readiness check FAILED');
    console.error('[AUTH-READINESS]', error.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
      console.log('[AUTH-READINESS] Database connection closed');
    } catch (closeError) {
      console.warn('[AUTH-READINESS] Failed to close database connection:', closeError.message);
    }
  }
}

main();
