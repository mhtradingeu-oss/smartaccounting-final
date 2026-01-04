'use strict';

const VALID_STATUSES = ['draft', 'submitted', 'accepted', 'rejected'];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tax_reports
      ADD CONSTRAINT tax_reports_status_check
      CHECK (status IN (${VALID_STATUSES.map((status) => `'${status}'`).join(', ')}));
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tax_reports
      DROP CONSTRAINT IF EXISTS tax_reports_status_check;
    `);
  },
};
