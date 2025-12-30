'use strict';

module.exports = {
  up: async (queryInterface) => {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      return;
    }
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await queryInterface.sequelize.query(
      'ALTER TABLE "invoice_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();',
    );
  },

  down: async (queryInterface) => {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      return;
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE "invoice_items" ALTER COLUMN "id" DROP DEFAULT;',
    );
  },
};
