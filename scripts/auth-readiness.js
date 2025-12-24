#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { sequelize } = require('../src/models');

const sqliteRequested = process.env.USE_SQLITE === 'true';

function logDbMode() {
  const dialect = sequelize.getDialect();
  console.log('DB mode:', dialect);
  if (sqliteRequested && dialect !== 'sqlite') {
    throw new Error(`USE_SQLITE=true requires sqlite dialect, found ${dialect}`);
  }
}

function ensureJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be defined for auth readiness');
  }
  console.log('JWT secret configured (length:', jwtSecret.length + ')');
}

async function main() {
  try {
    logDbMode();
    ensureJwtSecret();
    await sequelize.authenticate();
    console.log('Auth readiness check passed');
  } catch (error) {
    console.error('Auth readiness check failed:', error.message);
    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('Failed to close database connection:', closeError.message);
    }
  }
}

main();
