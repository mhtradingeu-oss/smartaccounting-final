"use strict";
const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const firstName = process.env.ADMIN_FIRST_NAME || "System";
    const lastName = process.env.ADMIN_LAST_NAME || "Admin";
    const taxId = process.env.ADMIN_COMPANY_TAX_ID;
    if (!email || !password || !firstName || !lastName || !taxId) {
      throw new Error(
        "Missing required ADMIN_* environment variables. Please set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, and ADMIN_COMPANY_TAX_ID.",
      );
    }
    // Check if admin user already exists
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1;",
      { replacements: { email } },
    );
    if (users.length > 0) {
      // Already seeded
      return;
    }
    // Get company by tax ID
    const [companies] = await queryInterface.sequelize.query(
      "SELECT id FROM companies WHERE taxId = :taxId LIMIT 1;",
      { replacements: { taxId } },
    );
    if (companies.length === 0) {
      throw new Error("Admin company not found by tax ID. Run the company seeder first.");
    }
    const companyId = companies[0].id;
    // Hash password using bcryptjs (same as authService)
    const hashedPassword = await bcrypt.hash(password, 10);
    await queryInterface.bulkInsert(
      "users",
      [
        {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: "admin",
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
      await queryInterface.bulkDelete("users", { email }, {});
    }
  },
};
