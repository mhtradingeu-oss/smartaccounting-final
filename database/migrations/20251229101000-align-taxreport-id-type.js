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
    // Ensure pgcrypto available (CREATE EXTENSION is idempotent)
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    const TAX_REPORT_COLUMNS = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tax_reports'
        AND column_name IN ('id', 'id_new', 'id_old');
    `;

    const fetchColumns = async () => {
      const [rows] = await queryInterface.sequelize.query(TAX_REPORT_COLUMNS);
      return rows;
    };

    const existingColumns = await fetchColumns();
    const columnNames = new Set(existingColumns.map((column) => column.column_name));

    if (columnNames.has('id_new')) {
      console.log('[SKIP] tax_reports.id_new already exists');
    } else {
      await queryInterface.addColumn('tax_reports', 'id_new', {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      });
    }

    const columnsAfterAdd = await fetchColumns();
    const hasIdNew = columnsAfterAdd.some((column) => column.column_name === 'id_new');

    if (hasIdNew) {
      // Backfill any rows where the UUID was not populated yet
      await queryInterface.sequelize.query(`
        UPDATE tax_reports
        SET id_new = gen_random_uuid()
        WHERE id_new IS NULL;
      `);
    }

    const promoteToUuid = async () => {
      const latestColumns = await fetchColumns();
      const columnSet = new Set(latestColumns.map((column) => column.column_name));

      if (!columnSet.has('id_new')) {
        console.log('[SKIP] tax_reports.id_new promotion already finished');
        return;
      }

      await queryInterface.sequelize.query(`
        ALTER TABLE "tax_reports"
        DROP CONSTRAINT IF EXISTS "tax_reports_pkey";
      `);

      const idExists = columnSet.has('id');
      const idOldExists = columnSet.has('id_old');

      if (idExists && !idOldExists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE "tax_reports"
          RENAME COLUMN "id" TO "id_old";
        `);
      }

      await queryInterface.sequelize.query(`
        ALTER TABLE "tax_reports"
        RENAME COLUMN "id_new" TO "id";
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE "tax_reports"
        ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE "tax_reports"
        ADD PRIMARY KEY ("id");
      `);

      console.log('[INFO] tax_reports.id_new promoted to UUID PK (id_old retained)');
    };

    await promoteToUuid();
  },

  down: async () => {
    // No down migration (expand-only, production-safe)
  },
};
