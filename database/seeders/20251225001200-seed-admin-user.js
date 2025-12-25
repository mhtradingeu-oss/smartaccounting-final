'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME;
    if (!email || !password || !name) {
      throw new Error(
        'Missing required ADMIN_* environment variables. Please set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME.',
      );
    }
    // Check if admin user already exists
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1;',
      { replacements: { email } },
    );
    if (users.length > 0) {
      // Already seeded
      return;
    }
    // Get Default Company ID
    const [companies] = await queryInterface.sequelize.query(
      "SELECT id FROM companies WHERE name = 'Default Company' LIMIT 1;",
    );
    if (companies.length === 0) {
      throw new Error('Default Company not found. Run the company seeder first.');
    }
    const companyId = companies[0].id;
    // Hash password using bcryptjs (same as authService)
    const hashedPassword = await bcrypt.hash(password, 10);
    await queryInterface.bulkInsert(
      'users',
      [
        {
          name,
          email,
          password: hashedPassword,
          role: 'admin',
          companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },
  down: async (queryInterface, Sequelize) => {
    const email = process.env.ADMIN_EMAIL;
    if (email) {
      await queryInterface.bulkDelete('users', { email }, {});
    }
  },
};
