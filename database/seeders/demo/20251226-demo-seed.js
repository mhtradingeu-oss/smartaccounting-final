'use strict';
const bcrypt = require('bcryptjs');

const DEMO_STATEMENT_FILE = 'demo-statement-jan.csv';

const requireDemoSeedEnabled = (phase) => {
  const demoModeEnabled = process.env.DEMO_MODE === 'true';
  const demoSeedAllowed = process.env.ALLOW_DEMO_SEED === 'true';
  if (!demoModeEnabled || !demoSeedAllowed) {
    throw new Error(
      `[DEMO SEED] ${phase}: requires DEMO_MODE=true and ALLOW_DEMO_SEED=true (DEMO_MODE=${process.env.DEMO_MODE}, ALLOW_DEMO_SEED=${process.env.ALLOW_DEMO_SEED})`,
    );
  }
};

/**
 * DEMO DATA SEEDER (SAFE, AUDITABLE, DEMO-ONLY)
 *
 * - Seeds one demo company, multiple users (admin, accountant, viewer),
 *   a small set of invoices, expenses, and bank statements.
 * - Idempotent: running multiple times will not duplicate data.
 * - Will NOT run in production unless DEMO_MODE=true.
 * - Will NOT modify or delete any existing production data.
 * - Console logs describe what was seeded.
 */

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    requireDemoSeedEnabled('up');

    // === DEMO COMPANY ===
    const DEMO_COMPANY = {
      name: 'Demo Company',
      taxId: 'DEMO-TAX-123',
      address: '123 Demo St',
      city: 'Demo City',
      postalCode: '12345',
      country: 'DE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    let [companies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId: DEMO_COMPANY.taxId } },
    );
    let companyId;
    if (companies.length > 0) {
      companyId = companies[0].id;
      console.log('[DEMO SEED] Demo company already exists.');
    } else {
      const insertionResult = await queryInterface.bulkInsert('companies', [DEMO_COMPANY], {
        returning: true,
      });
      if (Array.isArray(insertionResult) && insertionResult.length > 0) {
        companyId = insertionResult[0].id;
      }
      if (!companyId) {
        // fallback for sqlite/mysql
        [companies] = await queryInterface.sequelize.query(
          'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
          { replacements: { taxId: DEMO_COMPANY.taxId } },
        );
        companyId = companies[0].id;
      }
      console.log('[DEMO SEED] Demo company created.');
    }

    // === DEMO USERS ===
    const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';
    const demoUserTemplates = [
      {
        email: 'demo-admin@demo.com',
        firstName: 'Demo',
        lastName: 'Admin',
        role: 'admin',
      },
      {
        email: 'demo-accountant@demo.com',
        firstName: 'Demo',
        lastName: 'Accountant',
        role: 'accountant',
      },
      {
        email: 'demo-viewer@demo.com',
        firstName: 'Demo',
        lastName: 'Viewer',
        role: 'viewer',
      },
    ];
    for (const template of demoUserTemplates) {
      const missing = [];
      if (!template.firstName) {missing.push('firstName');}
      if (!template.lastName) {missing.push('lastName');}
      if (!template.role) {missing.push('role');}
      if (missing.length > 0) {
        throw new Error(`[DEMO SEED] ${template.email} missing required fields: ${missing.join(', ')}`);
      }
      const user = {
        ...template,
        password: await bcrypt.hash(DEMO_PASSWORD, 10),
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const [users] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: user.email } },
      );
      if (users.length === 0) {
        await queryInterface.bulkInsert('users', [user], {});
        console.log(`[DEMO SEED] Created user: ${user.email} (role=${user.role})`);
      } else {
        console.log(`[DEMO SEED] User already exists: ${user.email} (role=${user.role})`);
      }
    }
    // Get user IDs for demo data
    const [[adminUser]] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1;',
      { replacements: { email: 'demo-admin@demo.com' } },
    );
    const [[accountantUser]] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1;',
      { replacements: { email: 'demo-accountant@demo.com' } },
    );
    // === DEMO INVOICES ===
    const demoInvoices = [
      {
        invoiceNumber: 'DEMO-INV-001',
        subtotal: 1000.0,
        total: 1190.0,
        amount: 1190.0,
        currency: 'EUR',
        status: 'PAID',
        date: '2025-01-01',
        dueDate: '2025-01-15',
        clientName: 'Demo Retail GmbH',
        notes: 'Payment received for January consulting',
        userId: adminUser.id,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        invoiceNumber: 'DEMO-INV-002',
        subtotal: 500.0,
        total: 595.0,
        amount: 595.0,
        currency: 'EUR',
        status: 'SENT',
        date: '2025-01-10',
        dueDate: '2025-01-25',
        clientName: 'Demo Services AG',
        notes: 'Monthly accounting bundle',
        userId: accountantUser.id,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const invoice of demoInvoices) {
      const [invs] = await queryInterface.sequelize.query(
        'SELECT id FROM invoices WHERE "invoiceNumber" = :invoiceNumber AND "companyId" = :companyId LIMIT 1;',
        {
          replacements: {
            invoiceNumber: invoice.invoiceNumber,
            companyId: invoice.companyId,
          },
        },
      );
      if (invs.length === 0) {
        await queryInterface.bulkInsert('invoices', [invoice], {});
        console.log(`[DEMO SEED] Invoice seeded: ${invoice.invoiceNumber}`);
      } else {
        console.log(`[DEMO SEED] Invoice already exists: ${invoice.invoiceNumber}`);
      }
    }

    // === DEMO EXPENSES ===
    const demoExpenses = [
      {
        description: 'Demo office rent',
        vendorName: 'Demo Landlord GmbH',
        expenseDate: '2025-01-05',
        date: '2025-01-05',
        category: 'Rent',
        netAmount: 1000.0,
        vatRate: 19.0,
        vatAmount: 190.0,
        grossAmount: 1190.0,
        amount: 1190.0,
        currency: 'EUR',
        status: 'draft',
        source: 'manual',
        userId: adminUser.id,
        createdByUserId: adminUser.id,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        description: 'Demo software subscription',
        vendorName: 'Demo SaaS Ltd',
        expenseDate: '2025-01-12',
        date: '2025-01-12',
        category: 'Subscriptions',
        netAmount: 50.0,
        vatRate: 19.0,
        vatAmount: 9.5,
        grossAmount: 59.5,
        amount: 59.5,
        currency: 'EUR',
        status: 'draft',
        source: 'manual',
        userId: accountantUser.id,
        createdByUserId: accountantUser.id,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const expense of demoExpenses) {
      const [exps] = await queryInterface.sequelize.query(
        'SELECT id FROM expenses WHERE "description" = :description AND "companyId" = :companyId LIMIT 1;',
        { replacements: { description: expense.description, companyId } },
      );
      if (exps.length === 0) {
        await queryInterface.bulkInsert('expenses', [expense], {});
        console.log(`[DEMO SEED] Expense seeded: ${expense.description}`);
      } else {
        console.log(`[DEMO SEED] Expense already exists: ${expense.description}`);
      }
    }

    // === DEMO BANK STATEMENTS ===
    const demoStatements = [
      {
        statementDate: '2025-01-31',
        fileName: DEMO_STATEMENT_FILE,
        fileFormat: 'csv',
        bankName: 'Demo Bank Berlin',
        accountNumber: 'DE89370400440532013000',
        iban: 'DE89370400440532013000',
        filePath: '/tmp/demo-statement-jan.csv',
        statementPeriodStart: '2025-01-01',
        statementPeriodEnd: '2025-01-31',
        openingBalance: 10000.0,
        closingBalance: 11000.0,
        currency: 'EUR',
        status: 'PROCESSED',
        totalTransactions: 6,
        processedTransactions: 6,
        importDate: '2025-02-01',
        userId: adminUser.id,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const stmt of demoStatements) {
      const [stmts] = await queryInterface.sequelize.query(
        'SELECT id FROM bank_statements WHERE "fileName" = :fileName AND "companyId" = :companyId LIMIT 1;',
        { replacements: { fileName: stmt.fileName, companyId } },
      );
      if (stmts.length === 0) {
        await queryInterface.bulkInsert('bank_statements', [stmt], {});
        console.log(`[DEMO SEED] Bank statement seeded for ${stmt.fileName}`);
      } else {
        console.log(`[DEMO SEED] Bank statement already exists for ${stmt.fileName}`);
      }
    }

    console.log('[DEMO SEED] Demo data seeding complete.');
  },

  down: async (queryInterface, _Sequelize) => {
    requireDemoSeedEnabled('down');
    const [companies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId: 'DEMO-TAX-123' } },
    );
    const companyId = companies.length > 0 ? companies[0].id : null;

    const expenseFilter = {
      description: ['Demo office rent', 'Demo software subscription'],
    };
    const invoiceFilter = {
      invoiceNumber: ['DEMO-INV-001', 'DEMO-INV-002'],
    };
    const statementFilter = {
      fileName: DEMO_STATEMENT_FILE,
    };
    if (companyId) {
      expenseFilter.companyId = companyId;
      invoiceFilter.companyId = companyId;
      statementFilter.companyId = companyId;
    }
    // Remove demo data only
    await queryInterface.bulkDelete('bank_statements', statementFilter, {});
    await queryInterface.bulkDelete('expenses', expenseFilter, {});
    await queryInterface.bulkDelete('invoices', invoiceFilter, {});
    await queryInterface.bulkDelete(
      'users',
      { email: ['demo-admin@demo.com', 'demo-accountant@demo.com', 'demo-viewer@demo.com'] },
      {},
    );
    await queryInterface.bulkDelete('companies', { taxId: 'DEMO-TAX-123' }, {});
    console.log('[DEMO SEED] Demo data removed.');
  },
};
