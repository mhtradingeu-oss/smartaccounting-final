const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const migrationsDir = path.resolve(__dirname, '..', '..', 'database', 'migrations');
let migrationFiles = [];

try {
  migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.js'))
    .sort();
} catch (error) {
  console.error('Failed to read migrations directory:', error.message);
  migrationFiles = [];
}

async function checkMigrations() {
  if (!migrationFiles.length) {
    return {
      status: 'unknown',
      total: 0,
      applied: 0,
      missing: [],
      error: 'No migration files were found',
    };
  }

  try {
    const rows = await sequelize.query('SELECT name FROM "SequelizeMeta";', {
      type: QueryTypes.SELECT,
    });
    const applied = rows.map((row) => row.name);
    const missing = migrationFiles.filter((name) => !applied.includes(name));
    return {
      status: missing.length ? 'missing' : 'complete',
      total: migrationFiles.length,
      applied: applied.length,
      missing,
    };
  } catch (error) {
    return {
      status: 'error',
      total: migrationFiles.length,
      applied: 0,
      missing: migrationFiles,
      error: error.message,
    };
  }
}

function getMigrationFiles() {
  return [...migrationFiles];
}

module.exports = {
  checkMigrations,
  getMigrationFiles,
};
