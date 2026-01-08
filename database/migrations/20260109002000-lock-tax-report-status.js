'use strict';

const VALID_STATUSES = ['draft', 'submitted', 'accepted', 'rejected'];

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE tax_reports
        ADD CONSTRAINT tax_reports_status_check
        CHECK (status IN (${VALID_STATUSES.map((status) => `'${status}'`).join(', ')}));
      `);
    } else if (dialect === 'sqlite') {
      // SQLite does not support adding check constraints after table creation.
      // This constraint is enforced only in Postgres.
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE tax_reports
        DROP CONSTRAINT IF EXISTS tax_reports_status_check;
      `);
    } else if (dialect === 'sqlite') {
      // No-op: nothing to drop in SQLite.
    }
  },
};
