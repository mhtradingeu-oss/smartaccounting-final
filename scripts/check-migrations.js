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

async function main() {
  try {
    logDbMode();
    await sequelize.authenticate();
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('Tables discovered:', Array.isArray(tables) ? tables.length : tables);
  } catch (error) {
    console.error('Migration readiness check failed:', error.message);
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
