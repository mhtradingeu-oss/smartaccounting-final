'use strict';

const Sequelize = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.changeColumn('audit_logs', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
    await queryInterface.changeColumn('audit_logs', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_immutable_check CHECK (immutable IS TRUE);
    `);
  },

  async down(queryInterface) {
    await queryInterface.changeColumn('audit_logs', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
    });
    await queryInterface.changeColumn('audit_logs', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE audit_logs
      DROP CONSTRAINT IF EXISTS audit_logs_immutable_check;
    `);
  },
};
