#!/usr/bin/env node
'use strict';

/**
 * SmartAccounting — Restore Verification Script
 *
 * Purpose:
 * - Verify database integrity AFTER restore / PITR
 * - Ensure audit log hash chain integrity
 * - Provide deterministic proof for CI / Ops
 *
 * Read-only. Safe to run multiple times.
 */

require('dotenv').config();

const AuditLogService = require('../../src/services/auditLogService');
const { sequelize, Company, Invoice, TaxReport, AuditLog } = require('../../src/models');

const EXPECT_MIN_DATA = process.env.VERIFY_MIN_DATA !== 'false';
const MIN_COUNTS = {
  companies: 1,
  invoices: 1,
  taxReports: 1,
  auditLogs: 1,
};

function log(msg) {
  console.log(`[VERIFY][${new Date().toISOString()}] ${msg}`);
}

function fail(msg, code = 1) {
  console.error(`[VERIFY][ERROR] ${msg}`);
  process.exit(code);
}

async function verifyEnvironment() {
  const env = process.env.NODE_ENV || 'undefined';
  const dialect = sequelize.getDialect();

  log(`NODE_ENV: ${env}`);
  log(`DB dialect: ${dialect}`);

  if (env === 'production' && process.env.ALLOW_VERIFY_PROD !== 'true') {
    fail(
      'Refusing to run restore verification on production without ALLOW_VERIFY_PROD=true',
      3,
    );
  }
}

async function verifyTablesExist() {
  const qi = sequelize.getQueryInterface();
  const tables = await qi.showAllTables();
  const normalized = tables.map((t) =>
    typeof t === 'string' ? t.toLowerCase() : String(t.tableName || t.name).toLowerCase(),
  );

  const required = ['companies', 'invoices', 'tax_reports', 'audit_logs'];

  for (const table of required) {
    if (!normalized.includes(table)) {
      fail(`Required table missing after restore: ${table}`, 4);
    }
  }

  log('All required tables exist');
}

async function verifyCounts() {
  const [companyCount, invoiceCount, taxReportCount, auditCount] = await Promise.all([
    Company.count(),
    Invoice.count(),
    TaxReport.count(),
    AuditLog.count(),
  ]);

  log(`Company count: ${companyCount}`);
  log(`Invoice count: ${invoiceCount}`);
  log(`Tax report count: ${taxReportCount}`);
  log(`Audit log count: ${auditCount}`);

  if (EXPECT_MIN_DATA) {
    if (companyCount < MIN_COUNTS.companies) {
      fail('No companies found after restore', 5);
    }
    if (invoiceCount < MIN_COUNTS.invoices) {
      fail('No invoices found after restore', 5);
    }
    if (taxReportCount < MIN_COUNTS.taxReports) {
      fail('No tax reports found after restore', 5);
    }
    if (auditCount < MIN_COUNTS.auditLogs) {
      fail('No audit logs found after restore', 5);
    }
  }
}

async function verifyAuditChain() {
  log('Validating audit log hash chain...');
  const chainValid = await AuditLogService.validateChain();

  log(`Audit hash chain valid: ${chainValid}`);

  if (!chainValid) {
    fail(
      'Audit hash chain validation FAILED. Do NOT promote this restore.',
      2,
    );
  }
}

async function main() {
  try {
    log('Starting restore verification');
    await sequelize.authenticate();

    await verifyEnvironment();
    await verifyTablesExist();
    await verifyCounts();
    await verifyAuditChain();

    log('RESTORE VERIFICATION PASSED ✅');
    process.exit(0);
  } catch (error) {
    fail(`Restore verification crashed: ${error.message}`, 1);
  } finally {
    try {
      await sequelize.close();
    } catch (_) {
      // intentionally ignored
    }
  }
}

main();
