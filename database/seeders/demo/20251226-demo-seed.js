'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const AuditLogService = require('../../../src/services/auditLogService');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';
const DEMO_COMPANY = {
  name: 'Demo Company',
  taxId: 'DEMO-TAX-123',
  address: '123 Demo St',
  city: 'Demo City',
  postalCode: '12345',
  country: 'DE',
  aiEnabled: true,
};

const DEMO_USERS = [
  { email: 'demo-admin@demo.com', firstName: 'Demo', lastName: 'Admin', role: 'admin' },
  { email: 'demo-accountant@demo.com', firstName: 'Demo', lastName: 'Accountant', role: 'accountant' },
  { email: 'demo-auditor@demo.com', firstName: 'Demo', lastName: 'Auditor', role: 'auditor' },
  { email: 'demo-viewer@demo.com', firstName: 'Demo', lastName: 'Viewer', role: 'viewer' },
];

const INVOICE_TEMPLATES = [
  {
    invoiceNumber: 'DEMO-INV-001',
    status: 'PAID',
    clientName: 'Demo Retail GmbH',
    notes: 'Payment received for January consulting',
    ownerKey: 'admin',
    date: '2025-01-01',
    dueDate: '2025-01-15',
    items: [
      { description: 'Technical consulting block (10h)', quantity: 10, unitPrice: 100, vatRate: 19 },
    ],
  },
  {
    invoiceNumber: 'DEMO-INV-002',
    status: 'SENT',
    clientName: 'Demo Services AG',
    notes: 'Monthly accounting bundle',
    ownerKey: 'accountant',
    date: '2025-01-10',
    dueDate: '2025-01-25',
    items: [
      { description: 'Accounting bundle (incl. reporting)', quantity: 1, unitPrice: 500, vatRate: 19 },
    ],
  },
  {
    invoiceNumber: 'DEMO-INV-003',
    status: 'DRAFT',
    clientName: 'Demo Partner GmbH',
    notes: 'Draft retainer for upcoming advisory work',
    ownerKey: 'accountant',
    date: '2025-02-01',
    dueDate: '2025-02-15',
    items: [
      { description: 'Advisory retainer (3 sessions)', quantity: 3, unitPrice: 450, vatRate: 19 },
    ],
  },
];

const EXPENSE_TEMPLATES = [
  {
    description: 'Demo office rent',
    vendorName: 'Demo Landlord GmbH',
    expenseDate: '2025-01-05',
    category: 'Rent',
    netAmount: 1000.0,
    vatRate: 19.0,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'January rent for demo office',
  },
  {
    description: 'Demo software subscription',
    vendorName: 'Demo SaaS Ltd',
    expenseDate: '2025-01-12',
    category: 'Subscriptions',
    netAmount: 50.0,
    vatRate: 19.0,
    status: 'draft',
    source: 'manual',
    ownerKey: 'accountant',
    notes: 'Monthly analytics platform',
  },
  {
    description: 'Demo travel for Berlin summit',
    vendorName: 'Demo Travel',
    expenseDate: '2025-01-20',
    category: 'Travel',
    netAmount: 350.0,
    vatRate: 19.0,
    status: 'archived',
    source: 'upload',
    ownerKey: 'accountant',
    notes: 'On-site client summit in Berlin',
  },
];

const LEDGER_TRANSACTIONS = [
  {
    reference: 'DEMO-INV-001',
    description: 'Payment from Demo Retail GmbH for DEMO-INV-001',
    transactionDate: '2025-01-15',
    type: 'income',
    category: 'REVENUE',
    amount: 1190.0,
    vatRate: 19.0,
    vatAmount: 190.0,
    creditAmount: 1190.0,
    debitAmount: null,
    userKey: 'admin',
  },
  {
    reference: 'DEMO-EXP-RENT',
    description: 'Rent payment to Demo Landlord GmbH',
    transactionDate: '2025-01-05',
    type: 'expense',
    category: 'RENT',
    amount: 1190.0,
    vatRate: 19.0,
    vatAmount: 190.0,
    creditAmount: null,
    debitAmount: 1190.0,
    userKey: 'accountant',
  },
  {
    reference: 'DEMO-EXP-SOFTWARE',
    description: 'Subscription charge from Demo SaaS Ltd',
    transactionDate: '2025-01-12',
    type: 'expense',
    category: 'SUBSCRIPTIONS',
    amount: 59.5,
    vatRate: 19.0,
    vatAmount: 9.5,
    creditAmount: null,
    debitAmount: 59.5,
    userKey: 'accountant',
  },
];

const BANK_STATEMENT_TEMPLATE = {
  fileName: 'demo-statement-jan.csv',
  fileFormat: 'csv',
  filePath: '/tmp/demo-statement-jan.csv',
  bankName: 'Demo Bank Berlin',
  accountNumber: 'DE89370400440532013000',
  iban: 'DE89370400440532013000',
  statementPeriodStart: '2025-01-01',
  statementPeriodEnd: '2025-01-31',
  openingBalance: 9800.0,
  closingBalance: 11000.0,
  currency: 'EUR',
  status: 'PROCESSED',
  totalTransactions: 3,
  processedTransactions: 3,
  importDate: '2025-02-01',
};

const BANK_TRANSACTION_TEMPLATES = [
  {
    reference: 'DEMO-INV-001',
    description: 'Demo Retail GmbH payment (Invoice DEMO-INV-001)',
    amount: 1190.0,
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Demo Retail GmbH',
    date: '2025-01-15',
    valueDate: '2025-01-15',
    reconciledReference: 'DEMO-INV-001',
  },
  {
    reference: 'DEMO-EXP-RENT',
    description: 'Rent payout to Demo Landlord GmbH',
    amount: 1190.0,
    transactionType: 'DEBIT',
    category: 'RENT',
    vatCategory: 'VAT_19',
    counterpartyName: 'Demo Landlord GmbH',
    date: '2025-01-05',
    valueDate: '2025-01-06',
    reconciledReference: 'DEMO-EXP-RENT',
  },
  {
    reference: 'DEMO-EXP-SOFTWARE',
    description: 'Demo SaaS Ltd subscription fee',
    amount: 59.5,
    transactionType: 'DEBIT',
    category: 'SUBSCRIPTIONS',
    vatCategory: 'VAT_19',
    counterpartyName: 'Demo SaaS Ltd',
    date: '2025-01-12',
    valueDate: '2025-01-13',
    reconciledReference: null,
  },
];

const AI_INSIGHT_RULES = {
  latePayment: 'demo:late-payment-risk',
  missingReceipt: 'demo:expense-missing-receipt',
  duplicateCharge: 'demo:bank-duplicate-charge',
};

const TAX_REPORT_PERIOD = JSON.stringify({ quarter: 1, year: 2025 });

const AUDIT_LOG_REASONS = {
  invoice: 'demo:invoice-create',
  expense: 'demo:expense-create',
  bankStatement: 'demo:bank-statement-import',
  aiInsight: 'demo:ai-insight',
  aiDecision: 'demo:ai-decision',
  taxReport: 'demo:tax-report',
};

const requireDemoSeedEnabled = (phase) => {
  const demoModeEnabled = process.env.DEMO_MODE === 'true';
  const demoSeedAllowed = process.env.ALLOW_DEMO_SEED === 'true';
  if (!demoModeEnabled || !demoSeedAllowed) {
    throw new Error(
      `[DEMO SEED] ${phase}: requires DEMO_MODE=true and ALLOW_DEMO_SEED=true (DEMO_MODE=${process.env.DEMO_MODE}, ALLOW_DEMO_SEED=${process.env.ALLOW_DEMO_SEED})`,
    );
  }
};

const formatMoney = (value) => Number(Number(value).toFixed(2));

const buildInvoiceItems = (items) =>
  items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const vatRate = Number(item.vatRate);
    const lineNet = formatMoney(quantity * unitPrice);
    const lineVat = formatMoney((lineNet * vatRate) / 100);
    const lineGross = formatMoney(lineNet + lineVat);
    return {
      description: item.description,
      quantity,
      unitPrice,
      vatRate,
      lineNet,
      lineVat,
      lineGross,
    };
  });

const insertRecordAndReturnId = async (queryInterface, tableName, record, fallbackQuery, fallbackReplacements = {}) => {
  const insertionResult = await queryInterface.bulkInsert(tableName, [record], { returning: true });
  if (Array.isArray(insertionResult) && insertionResult.length > 0) {
    return insertionResult[0].id;
  }
  if (fallbackQuery) {
    const [rows] = await queryInterface.sequelize.query(fallbackQuery, { replacements: fallbackReplacements });
    return rows.length > 0 ? rows[0].id : null;
  }
  return null;
};

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    requireDemoSeedEnabled('up');
    const now = new Date();

    // === DEMO COMPANY ===
    let companyId;
    const [existingCompanies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId: DEMO_COMPANY.taxId } },
    );
    if (existingCompanies.length > 0) {
      companyId = existingCompanies[0].id;
      console.log('[DEMO SEED] Demo company already exists.');
    } else {
      const companyPayload = {
        ...DEMO_COMPANY,
        createdAt: now,
        updatedAt: now,
      };
      companyId = await insertRecordAndReturnId(
        queryInterface,
        'companies',
        companyPayload,
        'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
        { taxId: DEMO_COMPANY.taxId },
      );
      console.log('[DEMO SEED] Demo company created.');
    }

    // === DEMO USERS ===
    for (const template of DEMO_USERS) {
      const missing = [];
      if (!template.firstName) missing.push('firstName');
      if (!template.lastName) missing.push('lastName');
      if (!template.role) missing.push('role');
      if (missing.length > 0) {
        throw new Error(`[DEMO SEED] ${template.email} missing required fields: ${missing.join(', ')}`);
      }
      const userPayload = {
        ...template,
        password: await bcrypt.hash(DEMO_PASSWORD, 10),
        companyId,
        createdAt: now,
        updatedAt: now,
      };
      const [users] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: template.email } },
      );
      if (users.length === 0) {
        await queryInterface.bulkInsert('users', [userPayload], {});
        console.log(`[DEMO SEED] Created user: ${template.email} (role=${template.role})`);
      } else {
        console.log(`[DEMO SEED] User already exists: ${template.email} (role=${template.role})`);
      }
    }

    const userMap = {};
    for (const template of DEMO_USERS) {
      const [userRows] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: template.email } },
      );
      if (userRows.length === 0) {
        throw new Error(`[DEMO SEED] Unable to resolve user ${template.email}`);
      }
      userMap[template.role] = userRows[0].id;
    }

    // === DEMO INVOICES ===
    const invoiceIdByNumber = {};
    for (const template of INVOICE_TEMPLATES) {
      const [existingInvoices] = await queryInterface.sequelize.query(
        'SELECT id FROM invoices WHERE "invoiceNumber" = :invoiceNumber AND "companyId" = :companyId LIMIT 1;',
        { replacements: { invoiceNumber: template.invoiceNumber, companyId } },
      );
      if (existingInvoices.length > 0) {
        invoiceIdByNumber[template.invoiceNumber] = existingInvoices[0].id;
        console.log(`[DEMO SEED] Invoice already exists: ${template.invoiceNumber}`);
        continue;
      }
      const items = buildInvoiceItems(template.items || []);
      const subtotal = formatMoney(items.reduce((total, item) => total + item.lineNet, 0));
      const total = formatMoney(items.reduce((total, item) => total + item.lineGross, 0));
      const invoicePayload = {
        invoiceNumber: template.invoiceNumber,
        subtotal,
        total,
        amount: total,
        currency: 'EUR',
        status: template.status.toUpperCase(),
        date: template.date,
        dueDate: template.dueDate,
        clientName: template.clientName,
        notes: template.notes,
        userId: userMap[template.ownerKey] || userMap.accountant,
        companyId,
        createdAt: now,
        updatedAt: now,
      };
      const invoiceId = await insertRecordAndReturnId(
        queryInterface,
        'invoices',
        invoicePayload,
        'SELECT id FROM invoices WHERE "invoiceNumber" = :invoiceNumber AND "companyId" = :companyId LIMIT 1;',
        { invoiceNumber: template.invoiceNumber, companyId },
      );
      invoiceIdByNumber[template.invoiceNumber] = invoiceId;
      const itemRecords = items.map((item) => ({
        ...item,
        invoiceId,
        createdAt: now,
        updatedAt: now,
      }));
      await queryInterface.bulkInsert('InvoiceItems', itemRecords, {});
      console.log(`[DEMO SEED] Invoice seeded: ${template.invoiceNumber}`);
    }

    // === DEMO EXPENSES ===
    const expenseIdByDescription = {};
    for (const template of EXPENSE_TEMPLATES) {
      const [existingExpenses] = await queryInterface.sequelize.query(
        'SELECT id FROM expenses WHERE description = :description AND "companyId" = :companyId LIMIT 1;',
        { replacements: { description: template.description, companyId } },
      );
      if (existingExpenses.length > 0) {
        expenseIdByDescription[template.description] = existingExpenses[0].id;
        console.log(`[DEMO SEED] Expense already exists: ${template.description}`);
        continue;
      }
      const netAmount = template.netAmount;
      const vatAmount = formatMoney((netAmount * template.vatRate) / 100);
      const grossAmount = formatMoney(netAmount + vatAmount);
      const expensePayload = {
        description: template.description,
        vendorName: template.vendorName,
        expenseDate: template.expenseDate,
        date: template.expenseDate,
        category: template.category,
        netAmount,
        vatRate: template.vatRate,
        vatAmount,
        grossAmount,
        amount: grossAmount,
        currency: 'EUR',
        status: template.status,
        source: template.source,
        userId: userMap[template.ownerKey],
        createdByUserId: userMap[template.ownerKey],
        companyId,
        notes: template.notes,
        createdAt: now,
        updatedAt: now,
      };
      const expenseId = await insertRecordAndReturnId(
        queryInterface,
        'expenses',
        expensePayload,
        'SELECT id FROM expenses WHERE description = :description AND "companyId" = :companyId LIMIT 1;',
        { description: template.description, companyId },
      );
      expenseIdByDescription[template.description] = expenseId;
      console.log(`[DEMO SEED] Expense seeded: ${template.description}`);
    }

    // === DEMO TRANSACTIONS ===
    const transactionIdByReference = {};
    for (const template of LEDGER_TRANSACTIONS) {
      const [existingTransactions] = await queryInterface.sequelize.query(
        'SELECT id FROM transactions WHERE reference = :reference AND company_id = :companyId LIMIT 1;',
        { replacements: { reference: template.reference, companyId } },
      );
      if (existingTransactions.length > 0) {
        transactionIdByReference[template.reference] = existingTransactions[0].id;
        console.log(`[DEMO SEED] Ledger transaction already exists: ${template.reference}`);
        continue;
      }
      const transactionPayload = {
        id: uuidv4(),
        company_id: companyId,
        user_id: userMap[template.userKey] || userMap.admin,
        transaction_date: template.transactionDate,
        description: template.description,
        amount: template.amount,
        currency: 'EUR',
        type: template.type,
        category: template.category,
        vat_rate: template.vatRate,
        vat_amount: template.vatAmount,
        reference: template.reference,
        non_deductible: false,
        credit_amount: template.creditAmount,
        debit_amount: template.debitAmount,
        is_reconciled: false,
        bank_transaction_id: null,
        createdAt: now,
        updatedAt: now,
      };
      await queryInterface.bulkInsert('transactions', [transactionPayload], {});
      transactionIdByReference[template.reference] = transactionPayload.id;
      console.log(`[DEMO SEED] Ledger transaction created: ${template.reference}`);
    }

    // === DEMO BANK STATEMENT ===
    const [existingStatements] = await queryInterface.sequelize.query(
      'SELECT id FROM bank_statements WHERE "fileName" = :fileName AND "companyId" = :companyId LIMIT 1;',
      { replacements: { fileName: BANK_STATEMENT_TEMPLATE.fileName, companyId } },
    );
    let bankStatementId;
    if (existingStatements.length > 0) {
      bankStatementId = existingStatements[0].id;
      console.log('[DEMO SEED] Bank statement already exists.');
    } else {
      const statementPayload = {
        ...BANK_STATEMENT_TEMPLATE,
        userId: userMap.admin,
        companyId,
        createdAt: now,
        updatedAt: now,
      };
      bankStatementId = await insertRecordAndReturnId(
        queryInterface,
        'bank_statements',
        statementPayload,
        'SELECT id FROM bank_statements WHERE "fileName" = :fileName AND "companyId" = :companyId LIMIT 1;',
        { fileName: BANK_STATEMENT_TEMPLATE.fileName, companyId },
      );
      console.log('[DEMO SEED] Bank statement seeded.');
    }

    // === DEMO BANK TRANSACTIONS ===
    const bankTransactionIds = {};
    for (const template of BANK_TRANSACTION_TEMPLATES) {
      const [existingBankTx] = await queryInterface.sequelize.query(
        'SELECT id FROM bank_transactions WHERE reference = :reference AND "companyId" = :companyId LIMIT 1;',
        { replacements: { reference: template.reference, companyId } },
      );
      if (existingBankTx.length > 0) {
        bankTransactionIds[template.reference] = existingBankTx[0].id;
        console.log(`[DEMO SEED] Bank transaction already exists: ${template.reference}`);
        continue;
      }
      const bankTxPayload = {
        bankStatementId,
        date: template.date,
        value_date: template.valueDate,
        description: template.description,
        amount: template.amount,
        currency: 'EUR',
        transaction_type: template.transactionType,
        reference: template.reference,
        category: template.category,
        vat_category: template.vatCategory,
        counterparty_name: template.counterpartyName,
        is_reconciled: Boolean(template.reconciledReference),
        reconciled_with: template.reconciledReference
          ? transactionIdByReference[template.reconciledReference]
          : null,
        companyId,
        createdAt: now,
        updatedAt: now,
      };
      const bankTxId = await insertRecordAndReturnId(
        queryInterface,
        'bank_transactions',
        bankTxPayload,
        'SELECT id FROM bank_transactions WHERE reference = :reference AND "companyId" = :companyId LIMIT 1;',
        { reference: template.reference, companyId },
      );
      bankTransactionIds[template.reference] = bankTxId;
      if (template.reconciledReference) {
        const targetTransactionId = transactionIdByReference[template.reconciledReference];
        if (targetTransactionId) {
          await queryInterface.bulkUpdate(
            'transactions',
            { is_reconciled: true, bank_transaction_id: bankTxId },
            { id: targetTransactionId },
          );
        }
      }
      console.log(`[DEMO SEED] Bank transaction seeded: ${template.reference}`);
    }

    // === DEMO AI INSIGHTS & DECISIONS ===
    const aiInsightIds = {};
    const aiInsightPayloads = [];
    if (invoiceIdByNumber['DEMO-INV-002']) {
      aiInsightPayloads.push({
        companyId,
        entityType: 'invoice',
        entityId: String(invoiceIdByNumber['DEMO-INV-002']),
        type: 'late-payment-risk',
        severity: 'medium',
        confidenceScore: 0.82,
        summary: 'Invoice DEMO-INV-002 is overdue and may require a reminder.',
        why: 'Due date passed and no payment has been logged; customer history shows slow payments.',
        legalContext: 'AO §147 GoBD documentation requirements.',
        evidence: { dueDate: '2025-01-25', amount: 595.0, status: 'SENT' },
        ruleId: AI_INSIGHT_RULES.latePayment,
        modelVersion: 'v0.9-demo',
        featureFlag: 'ai-demo-mode',
        disclaimer: 'Suggestion only — confirm manually.',
        createdAt: now,
        updatedAt: now,
      });
    }
    if (expenseIdByDescription['Demo software subscription']) {
      aiInsightPayloads.push({
        companyId,
        entityType: 'expense',
        entityId: String(expenseIdByDescription['Demo software subscription']),
        type: 'missing-receipt',
        severity: 'high',
        confidenceScore: 0.91,
        summary: 'No receipt attached for Demo SaaS Ltd software subscription.',
        why: 'The expense is marked as needing documentation under §14 UStG.',
        legalContext: 'UStG §14 obligation to keep receipts.',
        evidence: { vendor: 'Demo SaaS Ltd', amount: 59.5 },
        ruleId: AI_INSIGHT_RULES.missingReceipt,
        modelVersion: 'v0.9-demo',
        featureFlag: 'ai-demo-mode',
        disclaimer: 'Suggestion only — confirm with finance.',
        createdAt: now,
        updatedAt: now,
      });
    }
    if (bankTransactionIds['DEMO-EXP-RENT']) {
      aiInsightPayloads.push({
        companyId,
        entityType: 'bankTransaction',
        entityId: String(bankTransactionIds['DEMO-EXP-RENT']),
        type: 'duplicate-charge',
        severity: 'low',
        confidenceScore: 0.75,
        summary: 'Similar rent payments detected in close succession.',
        why: 'Two rent payments of 1190 EUR appear within minutes.',
        legalContext: 'AO §147 vigilance around repeated entries.',
        evidence: { amount: 1190.0, reference: 'DEMO-EXP-RENT' },
        ruleId: AI_INSIGHT_RULES.duplicateCharge,
        modelVersion: 'v0.9-demo',
        featureFlag: 'ai-demo-mode',
        disclaimer: 'Suggestion only — adjust if duplicate.',
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const payload of aiInsightPayloads) {
      const insightId = await insertRecordAndReturnId(
        queryInterface,
        'ai_insights',
        payload,
        'SELECT id FROM ai_insights WHERE "ruleId" = :ruleId AND "entityId" = :entityId AND "companyId" = :companyId LIMIT 1;',
        { ruleId: payload.ruleId, entityId: payload.entityId, companyId },
      );
      if (insightId) {
        aiInsightIds[payload.ruleId] = insightId;
      }
    }

    const aiDecisionSpecs = [
      {
        insightRule: AI_INSIGHT_RULES.latePayment,
        actorRole: 'accountant',
        decision: 'accepted',
        reason: 'Confirmed risk and client notified.',
      },
      {
        insightRule: AI_INSIGHT_RULES.missingReceipt,
        actorRole: 'admin',
        decision: 'overridden',
        reason: 'Receipt arrived and has been archived.',
      },
    ];
    for (const spec of aiDecisionSpecs) {
      const insightId = aiInsightIds[spec.insightRule];
      if (!insightId) {
        continue;
      }
      const actorUserId = userMap[spec.actorRole];
      const [existingDecision] = await queryInterface.sequelize.query(
        'SELECT id FROM ai_insight_decisions WHERE "insightId" = :insightId AND "actorUserId" = :actorUserId LIMIT 1;',
        { replacements: { insightId, actorUserId } },
      );
      if (existingDecision.length > 0) {
        continue;
      }
      await queryInterface.bulkInsert('ai_insight_decisions', [
        {
          insightId,
          companyId,
          actorUserId,
          decision: spec.decision,
          reason: spec.reason,
          createdAt: now,
          updatedAt: now,
        },
      ], {});
    }

    // === DEMO TAX REPORT ===
    const [existingTaxReports] = await queryInterface.sequelize.query(
      'SELECT id FROM tax_reports WHERE "companyId" = :companyId AND "reportType" = :reportType AND "period" = :period LIMIT 1;',
      { replacements: { companyId, reportType: 'USt', period: TAX_REPORT_PERIOD } },
    );
    let taxReportId;
    if (existingTaxReports.length > 0) {
      taxReportId = existingTaxReports[0].id;
    } else {
      const taxReportPayload = {
        companyId,
        reportType: 'USt',
        period: TAX_REPORT_PERIOD,
        year: 2025,
        status: 'draft',
        data: {
          summary: { totalOutputTax: 190.0, totalInputTax: 9.5, vatPayable: 180.5 },
          details: { invoices: 3, expenses: 3 },
        },
        generatedAt: now,
        submittedBy: userMap.accountant,
        elsterStatus: 'pending',
        elsterTransferTicket: 'DEMO-ELSTER-01',
        createdAt: now,
        updatedAt: now,
      };
      taxReportId = await insertRecordAndReturnId(
        queryInterface,
        'tax_reports',
        taxReportPayload,
        'SELECT id FROM tax_reports WHERE "companyId" = :companyId AND "reportType" = :reportType AND "period" = :period LIMIT 1;',
        { companyId, reportType: 'USt', period: TAX_REPORT_PERIOD },
      );
    }

    // === DEMO AUDIT LOGS ===
    const auditEntries = [
      {
        action: 'invoice_created',
        resourceType: 'invoice',
        resourceId: 'DEMO-INV-001',
        userId: userMap.admin,
        newValues: { status: 'PAID', total: 1190.0 },
        reason: AUDIT_LOG_REASONS.invoice,
      },
      {
        action: 'expense_created',
        resourceType: 'expense',
        resourceId: 'Demo office rent',
        userId: userMap.admin,
        newValues: { status: 'booked', amount: 1190.0 },
        reason: AUDIT_LOG_REASONS.expense,
      },
      {
        action: 'bank_statement_imported',
        resourceType: 'bank_statement',
        resourceId: BANK_STATEMENT_TEMPLATE.fileName,
        userId: userMap.admin,
        newValues: { totalTransactions: BANK_TRANSACTION_TEMPLATES.length },
        reason: AUDIT_LOG_REASONS.bankStatement,
      },
      {
        action: 'tax_report_created',
        resourceType: 'tax_report',
        resourceId: taxReportId ? String(taxReportId) : 'USt-Q1-2025',
        userId: userMap.accountant,
        newValues: { status: 'draft' },
        reason: AUDIT_LOG_REASONS.taxReport,
      },
    ];
    if (aiInsightIds[AI_INSIGHT_RULES.latePayment]) {
      auditEntries.push({
        action: 'ai_insight_generated',
        resourceType: 'ai_insight',
        resourceId: String(aiInsightIds[AI_INSIGHT_RULES.latePayment]),
        userId: userMap.admin,
        newValues: { type: 'late-payment-risk' },
        reason: AUDIT_LOG_REASONS.aiInsight,
      });
    }
    if (aiInsightIds[AI_INSIGHT_RULES.missingReceipt]) {
      auditEntries.push({
        action: 'ai_insight_overridden',
        resourceType: 'ai_insight',
        resourceId: String(aiInsightIds[AI_INSIGHT_RULES.missingReceipt]),
        userId: userMap.admin,
        newValues: { decision: 'overridden' },
        reason: AUDIT_LOG_REASONS.aiDecision,
      });
    }
    for (const entry of auditEntries) {
      await AuditLogService.appendEntry({
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        userId: entry.userId,
        newValues: entry.newValues,
        reason: entry.reason,
        ipAddress: '127.0.0.1',
        userAgent: 'DemoSeeder/1.0',
      });
    }

    console.log('[DEMO SEED] Demo data seeding complete.');
  },

  down: async (queryInterface, _Sequelize) => {
    requireDemoSeedEnabled('down');
    const [companies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId: DEMO_COMPANY.taxId } },
    );
    const companyId = companies.length > 0 ? companies[0].id : null;
    if (!companyId) {
      console.log('[DEMO SEED] Demo company missing during rollback. Nothing to remove.');
      return;
    }

    await queryInterface.bulkDelete('audit_logs', { reason: Object.values(AUDIT_LOG_REASONS) }, {});

    const insightRuleIds = Object.values(AI_INSIGHT_RULES);
    const [insightRows] = await queryInterface.sequelize.query(
      'SELECT id FROM ai_insights WHERE "companyId" = :companyId AND "ruleId" IN (:ruleIds);',
      { replacements: { companyId, ruleIds: insightRuleIds } },
    );
    const insightIds = insightRows.map((row) => row.id);
    if (insightIds.length > 0) {
      await queryInterface.bulkDelete('ai_insight_decisions', { insightId: insightIds }, {});
    }
    await queryInterface.bulkDelete('ai_insights', { companyId, ruleId: insightRuleIds }, {});

    await queryInterface.bulkDelete(
      'tax_reports',
      { companyId, reportType: 'USt', period: TAX_REPORT_PERIOD },
      {},
    );

    await queryInterface.bulkDelete(
      'bank_transactions',
      { companyId, reference: BANK_TRANSACTION_TEMPLATES.map((t) => t.reference) },
      {},
    );

    await queryInterface.bulkDelete(
      'transactions',
      { company_id: companyId, reference: LEDGER_TRANSACTIONS.map((t) => t.reference) },
      {},
    );

    await queryInterface.bulkDelete('bank_statements', { companyId, fileName: BANK_STATEMENT_TEMPLATE.fileName }, {});

    await queryInterface.bulkDelete(
      'expenses',
      { companyId, description: EXPENSE_TEMPLATES.map((t) => t.description) },
      {},
    );

    await queryInterface.bulkDelete(
      'invoices',
      { companyId, invoiceNumber: INVOICE_TEMPLATES.map((t) => t.invoiceNumber) },
      {},
    );

    await queryInterface.bulkDelete('users', { email: DEMO_USERS.map((u) => u.email) }, {});
    await queryInterface.bulkDelete('companies', { taxId: DEMO_COMPANY.taxId }, {});
    console.log('[DEMO SEED] Demo data removed.');
  },
};
