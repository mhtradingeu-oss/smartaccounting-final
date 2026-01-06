#!/usr/bin/env node
'use strict';

/**
 * scripts/verify-schema.js
 * Production-grade schema verification before seeding / demo / CI
 */

require('dotenv').config();

const { sequelize } = require('../src/models');

const DIALECT = sequelize.getDialect();
const EXPECT_SQLITE = process.env.USE_SQLITE === 'true';

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
  users: ['id', 'email', 'companyId', 'role'],
  invoices: ['id', 'invoiceNumber', 'companyId', 'status', 'total'],
  expenses: ['id', 'companyId', 'amount', 'category'],
  ai_insights: [
    'id',
    'companyId',
    'entityType',
    'severity',
    'ruleId',
    'modelVersion',
    'featureFlag',
    'disclaimer',
    'evidence',
  ],
};

const OPTIONAL_ENUMS = {
  invoices: {
    status: ['DRAFT', 'PAID', 'PARTIALLY_PAID'],
  },
  ai_insights: {
    severity: ['low', 'medium', 'high'],
  },
};

function normalizeName(name) {
  return String(name).toLowerCase().replace(/"/g, '');
}

async function verifyDialect() {
  console.log(`[SCHEMA VERIFY] Dialect: ${DIALECT}`);
  if (EXPECT_SQLITE && DIALECT !== 'sqlite') {
    throw new Error(`USE_SQLITE=true but detected dialect=${DIALECT}`);
  }
}

async function checkTables() {
  const tables = await sequelize.getQueryInterface().showAllTables();

  const normalizedTables = tables.map((t) => {
    if (typeof t === 'string') {
      return normalizeName(t);
    }
    if (t?.tableName) {
      return normalizeName(t.tableName);
    }
    if (t?.name) {
      return normalizeName(t.name);
    }
    return normalizeName(t);
  });

  for (const table of REQUIRED_TABLES) {
    if (!normalizedTables.includes(normalizeName(table))) {
      throw new Error(`Missing required table: ${table}`);
    }
  }

  console.log(`[SCHEMA VERIFY] Tables OK (${REQUIRED_TABLES.length})`);
}

async function checkColumns() {
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const desc = await sequelize.getQueryInterface().describeTable(table);

    const normalizedCols = Object.keys(desc).map(normalizeName);

    for (const col of columns) {
      if (!normalizedCols.includes(normalizeName(col))) {
        throw new Error(`Missing column: ${table}.${col}`);
      }
    }
  }

  console.log('[SCHEMA VERIFY] Required columns OK');
}

async function checkEnums() {
  if (DIALECT !== 'postgres') {
    console.log('[SCHEMA VERIFY] ENUM checks skipped (not postgres)');
    return;
  }

  for (const [table, enums] of Object.entries(OPTIONAL_ENUMS)) {
    for (const [column, allowed] of Object.entries(enums)) {
      console.log(`[SCHEMA VERIFY] ENUM check hint: ${table}.${column} ∈ [${allowed.join(', ')}]`);
    }
  }
}

async function main() {
  try {
    console.log('========================================');
    console.log('[SCHEMA VERIFY] Starting schema verification');
    console.log(`[SCHEMA VERIFY] NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);
    console.log(`[SCHEMA VERIFY] USE_SQLITE=${process.env.USE_SQLITE || 'false'}`);
    console.log('========================================');

    await verifyDialect();
    await sequelize.authenticate();

    await checkTables();
    await checkColumns();
    await checkEnums();

    console.log('[SCHEMA VERIFY] ✅ Schema is READY for seeding');
    process.exit(0);
  } catch (err) {
    console.error('[SCHEMA VERIFY] ❌ FAILED');
    console.error(`[SCHEMA VERIFY] ${err.message}`);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (_) {
      // Intentionally ignore errors during sequelize.close()
    }
  }
}

main();
