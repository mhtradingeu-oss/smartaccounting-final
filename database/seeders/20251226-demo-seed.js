'use strict';
const bcrypt = require('bcryptjs');

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
    // === SAFETY GUARDS ===
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
      throw new Error('DEMO seeder will NOT run in production unless DEMO_MODE=true');
    }

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
      'SELECT id FROM companies WHERE taxId = :taxId LIMIT 1;',
      { replacements: { taxId: DEMO_COMPANY.taxId } },
    );
    let companyId;
    if (companies.length > 0) {
      companyId = companies[0].id;
      console.log('[DEMO SEED] Demo company already exists.');
    } else {
      const [result] = await queryInterface.bulkInsert('companies', [DEMO_COMPANY], {
        returning: true,
      });
      companyId = result ? result.id : null;
      if (!companyId) {
        // fallback for sqlite/mysql
        [companies] = await queryInterface.sequelize.query(
          'SELECT id FROM companies WHERE taxId = :taxId LIMIT 1;',
          { replacements: { taxId: DEMO_COMPANY.taxId } },
        );
        companyId = companies[0].id;
      }
      console.log('[DEMO SEED] Demo company created.');
    }

    // === DEMO USERS ===
    const demoUsers = [
      {
        email: 'demo-admin@demo.com',
        password: await bcrypt.hash('demopass1', 10),
        firstName: 'Demo',
        lastName: 'Admin',
        role: 'admin',
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'demo-accountant@demo.com',
        password: await bcrypt.hash('demopass2', 10),
        firstName: 'Demo',
        lastName: 'Accountant',
        role: 'accountant',
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'demo-viewer@demo.com',
        password: await bcrypt.hash('demopass3', 10),
        firstName: 'Demo',
        lastName: 'Viewer',
        role: 'viewer',
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const user of demoUsers) {
      const [users] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: user.email } },
      );
      if (users.length === 0) {
        await queryInterface.bulkInsert('users', [user], {});
        console.log(`[DEMO SEED] User seeded: ${user.email}`);
      } else {
        console.log(`[DEMO SEED] User already exists: ${user.email}`);
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
        clientName: 'Demo Client A',
        notes: 'Demo invoice for client A',
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
        clientName: 'Demo Client B',
        notes: 'Demo invoice for client B',
        userId: accountantUser.id,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const invoice of demoInvoices) {
      const [invs] = await queryInterface.sequelize.query(
        'SELECT id FROM invoices WHERE invoiceNumber = :invoiceNumber LIMIT 1;',
        { replacements: { invoiceNumber: invoice.invoiceNumber } },
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
        companyId,
        createdByUserId: adminUser.id,
        vendorName: 'Demo Landlord',
        expenseDate: '2025-01-05',
        category: 'Rent',
        netAmount: 1000.0,
        vatRate: 19.0,
        vatAmount: 190.0,
        grossAmount: 1190.0,
        currency: 'EUR',
        status: 'booked',
        notes: 'Demo rent expense',
        source: 'manual',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        description: 'Demo software subscription',
        companyId,
        createdByUserId: accountantUser.id,
        vendorName: 'Demo SaaS',
        expenseDate: '2025-01-12',
        category: 'Software',
        netAmount: 50.0,
        vatRate: 19.0,
        vatAmount: 9.5,
        grossAmount: 59.5,
        currency: 'EUR',
        status: 'booked',
        notes: 'Demo SaaS expense',
        source: 'manual',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const expense of demoExpenses) {
      const [exps] = await queryInterface.sequelize.query(
        'SELECT id FROM "Expenses" WHERE description = :description AND companyId = :companyId LIMIT 1;',
        { replacements: { description: expense.description, companyId } },
      );
      if (exps.length === 0) {
        await queryInterface.bulkInsert('Expenses', [expense], {});
        console.log(`[DEMO SEED] Expense seeded: ${expense.description}`);
      } else {
        console.log(`[DEMO SEED] Expense already exists: ${expense.description}`);
      }
    }

    // === DEMO BANK STATEMENTS ===
    const demoStatements = [
      {
        companyId,
        userId: adminUser.id,
        bankName: 'Demo Bank',
        accountNumber: 'DEMO-123456',
        iban: 'DE89370400440532013000',
        fileName: 'demo-statement-jan.csv',
        fileFormat: 'csv',
        filePath: '/demo/demo-statement-jan.csv',
        statementPeriodStart: '2025-01-01',
        statementPeriodEnd: '2025-01-31',
        openingBalance: 10000.0,
        closingBalance: 11000.0,
        currency: 'EUR',
        totalTransactions: 2,
        processedTransactions: 2,
        status: 'PROCESSED',
        importDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const stmt of demoStatements) {
      const [stmts] = await queryInterface.sequelize.query(
        'SELECT id FROM bank_statements WHERE fileName = :fileName AND companyId = :companyId LIMIT 1;',
        { replacements: { fileName: stmt.fileName, companyId } },
      );
      if (stmts.length === 0) {
        await queryInterface.bulkInsert('bank_statements', [stmt], {});
        console.log(`[DEMO SEED] Bank statement seeded: ${stmt.fileName}`);
      } else {
        console.log(`[DEMO SEED] Bank statement already exists: ${stmt.fileName}`);
      }
    }

    console.log('[DEMO SEED] Demo data seeding complete.');
  },

  down: async (queryInterface, _Sequelize) => {
    // Only allow down in demo mode
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
      throw new Error('DEMO seeder will NOT run in production unless DEMO_MODE=true');
    }
    // Remove demo data only
    await queryInterface.bulkDelete('bank_statements', { fileName: 'demo-statement-jan.csv' }, {});
    await queryInterface.bulkDelete(
      'Expenses',
      { description: ['Demo office rent', 'Demo software subscription'] },
      {},
    );
    await queryInterface.bulkDelete(
      'invoices',
      { invoiceNumber: ['DEMO-INV-001', 'DEMO-INV-002'] },
      {},
    );
    await queryInterface.bulkDelete(
      'users',
      { email: ['demo-admin@demo.com', 'demo-accountant@demo.com', 'demo-viewer@demo.com'] },
      {},
    );
    await queryInterface.bulkDelete('companies', { taxId: 'DEMO-TAX-123' }, {});
    console.log('[DEMO SEED] Demo data removed.');
  },
};
