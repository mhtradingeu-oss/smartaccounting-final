'use strict';

module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      return;
    }
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_invoices_status" ADD VALUE IF NOT EXISTS \'PARTIALLY_PAID\';',
    );
  },

  async down(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      return;
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_invoices_status" RENAME TO "enum_invoices_status_old";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'CREATE TYPE "enum_invoices_status" AS ENUM(\'DRAFT\', \'SENT\', \'PAID\', \'OVERDUE\', \'CANCELLED\');',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE invoices ALTER COLUMN status TYPE "enum_invoices_status" USING status::text::"enum_invoices_status";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_invoices_status_old";',
        { transaction },
      );
    });
  },
};
