const { Expense, AuditLog, TaxReport, BankStatementImportDryRun, AIInsight } = require('../../src/models');
const { sequelize } = require('../../src/lib/database');
const { QueryTypes } = require('sequelize');

const isPostgresMode = process.env.USE_SQLITE === 'false';
const describePostgres = isPostgresMode ? describe : describe.skip;

describePostgres('Postgres compliance gate', () => {
  const buildExpensePayload = () => ({
    description: 'VAT math test',
    amount: 100,
    currency: 'EUR',
    date: new Date(),
    userId: global.testUser.id,
    companyId: global.testCompany.id,
    createdByUserId: global.testUser.id,
    expenseDate: new Date(),
    category: 'compliance',
    netAmount: 100,
    vatRate: 0.19,
    vatAmount: 19,
    grossAmount: 119,
    notes: 'test',
    status: 'draft',
    source: 'manual',
    vendorName: 'VAT Test Vendor',
  });

  test('rejects expenses that violate the VAT math constraint', async () => {
    await expect(
      Expense.create({
        ...buildExpensePayload(),
        netAmount: 100,
        vatRate: 0.19,
        vatAmount: 20,
        grossAmount: 120,
      }),
    ).rejects.toThrow(/expenses_vat_math_consistency/);
  });

  test('prevents toggling audit log immutability', async () => {
    const auditLog = await AuditLog.create({
      action: 'compliance-check',
      resourceType: 'test',
      resourceId: '1',
      oldValues: {},
      newValues: {},
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      timestamp: new Date(),
      userId: global.testUser.id,
      companyId: global.testCompany.id,
      reason: 'system',
      hash: '',
      immutable: true,
    });

    await expect(auditLog.update({ immutable: false })).rejects.toThrow(/immutable/);
  });

  test('enforces tax report statuses', async () => {
    await expect(
      TaxReport.create({
        companyId: global.testCompany.id,
        reportType: 'UStG',
        period: '2026-Q1',
        status: 'pending',
        data: {},
      }),
    ).rejects.toThrow(/tax_reports_status_check/);
  });

  test('bank statement dry run statuses must be known', async () => {
    await expect(
      BankStatementImportDryRun.create({
        companyId: global.testCompany.id,
        userId: global.testUser.id,
        confirmationToken: 'token',
        filePath: '/tmp',
        fileName: 'foo.csv',
        fileFormat: 'CSV',
        status: 'UNKNOWN',
        summary: {},
        totalTransactions: 0,
        processedTransactions: 0,
        matches: 0,
        unmatched: 0,
        warnings: 0,
      }),
    ).rejects.toThrow(/bank_statement_import_dry_runs_status_check/);
  });

  test('ai insights severity is limited to the approved list', async () => {
    await expect(
      AIInsight.create({
        companyId: global.testCompany.id,
        entityType: 'invoice',
        entityId: '1',
        type: 'vat',
        severity: 'critical',
        confidenceScore: 0.5,
        summary: 'summary',
        why: 'why',
        legalContext: 'context',
        evidence: {},
        ruleId: 'rule',
        modelVersion: '1',
        featureFlag: 'flag',
        disclaimer: 'disclaimer',
      }),
    ).rejects.toThrow(/ai_insights_severity_check/);
  });

  test('Postgres metadata declares compliance constraints', async () => {
    const requiredColumns = [
      'createdByUserId',
      'netAmount',
      'vatAmount',
      'grossAmount',
      'vatRate',
    ];
    const columnList = requiredColumns.map((column) => `'${column}'`).join(', ');
    const columnRows = await sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'expenses'
        AND column_name IN (${columnList})
        AND is_nullable = 'NO';
    `,
      {
        type: QueryTypes.SELECT,
      },
    );

    const returnedColumnNames = columnRows.map((row) => row.column_name);
    expect(returnedColumnNames.sort()).toEqual(requiredColumns.sort());

    const constraintNames = [
      'expenses_vat_math_consistency',
      'tax_reports_status_check',
      'audit_logs_immutable_check',
      'bank_statement_import_dry_runs_status_check',
      'ai_insights_severity_check',
    ];
    const constraintList = constraintNames.map((name) => `'${name}'`).join(', ');
    const constraintRows = await sequelize.query(
      `
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (${constraintList});
    `,
      {
        type: QueryTypes.SELECT,
      },
    );
    const returnedConstraintNames = constraintRows.map((row) => row.conname);
    expect(returnedConstraintNames.sort()).toEqual(constraintNames.sort());
  });
});
