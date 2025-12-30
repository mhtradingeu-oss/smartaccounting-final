'use strict';

// 20251229101000-align-taxreport-id-type.js
// Aligns tax_reports.id to UUID (expand phase, idempotent, production-safe)

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') {
      return;
    }

    // Check if id_new already exists
    const [[exists]] = await queryInterface.sequelize.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'tax_reports'
        AND column_name = 'id_new'
      LIMIT 1;
    `);

    if (exists) {
      console.log('[SKIP] tax_reports.id_new already exists');
      return;
    }

    // Ensure pgcrypto available
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // Expand: add new UUID column
    await queryInterface.addColumn('tax_reports', 'id_new', {
      type: Sequelize.UUID,
      allowNull: false,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    });

    // Backfill (safe even for empty table)
    await queryInterface.sequelize.query(`
      UPDATE tax_reports
      SET id_new = gen_random_uuid()
      WHERE id_new IS NULL;
    `);
  },

  down: async () => {
    // No down migration (expand-only, production-safe)
  },
};
