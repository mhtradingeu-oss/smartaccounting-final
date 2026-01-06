'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    // ❌ Block execution in DEMO_MODE
    if (process.env.DEMO_MODE === 'true') {
      throw new Error('Admin seeder must NOT run in DEMO_MODE. Use demo users instead.');
    }

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const firstName = process.env.ADMIN_FIRST_NAME || 'System';
    const lastName = process.env.ADMIN_LAST_NAME || 'Admin';
    const taxId = process.env.ADMIN_COMPANY_TAX_ID;

    if (!email || !password || !taxId) {
      throw new Error(
        'Missing required ADMIN_* environment variables. ' +
          'Please set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_COMPANY_TAX_ID.',
      );
    }

    // 🔍 Check if admin user already exists
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1;',
      { replacements: { email } },
    );

    if (users.length > 0) {
      console.log('[ADMIN SEED] Admin user already exists. Skipping.');
      return;
    }

    // 🔍 Resolve company by tax ID
    const [companies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId } },
    );

    if (companies.length === 0) {
      throw new Error('Admin company not found by tax ID. Run the company migration/seed first.');
    }

    const companyId = companies[0].id;

    // 🔐 Hash password (same method as authService)
    const hashedPassword = await bcrypt.hash(password, 10);

    await queryInterface.bulkInsert(
      'users',
      [
        {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'admin',
          companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );

    console.log(`[ADMIN SEED] Admin user created: ${email}`);
  },

  down: async (queryInterface, _Sequelize) => {
    const email = process.env.ADMIN_EMAIL;

    if (!email) {
      console.warn('[ADMIN SEED] ADMIN_EMAIL not set. Nothing to rollback.');
      return;
    }

    await queryInterface.bulkDelete('users', { email }, {});
    console.log(`[ADMIN SEED] Admin user removed: ${email}`);
  },
};
