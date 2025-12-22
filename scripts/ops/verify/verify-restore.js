#!/usr/bin/env node
require('dotenv').config();

const AuditLogService = require('../../src/services/auditLogService');
const { sequelize, Company, Invoice, TaxReport, AuditLog } = require('../../src/models');

async function main() {
  try {
    await sequelize.authenticate();
    const [companyCount, invoiceCount, taxReportCount, auditCount] = await Promise.all([
      Company.count(),
      Invoice.count(),
      TaxReport.count(),
      AuditLog.count(),
    ]);

    console.log('Company count:', companyCount);
    console.log('Invoice count:', invoiceCount);
    console.log('Tax report count:', taxReportCount);
    console.log('Audit log count:', auditCount);

    const chainValid = await AuditLogService.validateChain();
    console.log('Audit hash chain valid:', chainValid);

    if (!chainValid) {
      console.error('Audit hash chain validation failed. Investigate logs before promoting restore.');
      process.exitCode = 2;
    }
  } catch (error) {
    console.error('Restore verification failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
