#!/usr/bin/env node
'use strict';

// scripts/verify-schema.js
// Verifies required tables, columns, and enums exist before seeding

const { sequelize } = require('../src/models');
const { QueryTypes } = require('sequelize');

const REQUIRED_TABLES = [
  'companies',
  'users',
  'ai_insights',
  'expenses',
  'invoices',
  'invoice_items',
  'bank_statements',
  'bank_transactions',
  'tax_reports',
  'active_tokens',
  'revoked_tokens',
  'file_attachments',
];

const REQUIRED_COLUMNS = {
  companies: ['id', 'name', 'taxId', 'aiEnabled'],
  users: ['id', 'email', 'companyId'],
  ai_insights: [
    'id',
    'companyId',
    'entityType',
    'severity',
    'legalContext',
    'evidence',
    'ruleId',
    'modelVersion',
    'featureFlag',
    'disclaimer',
  ],
  // Add more as needed
};

async function checkTables() {
  const tables = await sequelize.getQueryInterface().showAllTables();
  for (const table of REQUIRED_TABLES) {
    if (!tables.includes(table)) {
      throw new Error(`[SCHEMA VERIFY] Missing required table: ${table}`);
    }
  }
}

async function checkColumns() {
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const desc = await sequelize.getQueryInterface().describeTable(table);
    for (const col of columns) {
      if (!desc[col]) {
        throw new Error(`[SCHEMA VERIFY] Missing column: ${table}.${col}`);
      }
    }
  }
}

async function checkEnums() {
  if (sequelize.getDialect() !== 'postgres') {
    return;
  }
  // Example: check ai_insights.entityType enum values
  const [result] = await sequelize.query(
    "SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'enum_ai_insights_entityType';",
    { type: QueryTypes.SELECT },
  );
  if (!result) {
    throw new Error(
      '[SCHEMA VERIFY] Enum type enum_ai_insights_entityType missing or incompatible',
    );
  }
  // Add more enum checks as needed
}

async function main() {
  try {
    await checkTables();
    await checkColumns();
    await checkEnums();
    console.log('[SCHEMA VERIFY] Schema is ready for seeding.');
    process.exit(0);
  } catch (err) {
    console.error(`[SCHEMA VERIFY] ERROR: ${err.message}`);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
