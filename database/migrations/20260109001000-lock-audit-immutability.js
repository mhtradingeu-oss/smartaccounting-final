'use strict';

const Sequelize = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
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

    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE audit_logs
        ADD CONSTRAINT audit_logs_immutable_check CHECK (immutable IS TRUE);
      `);
    } else if (dialect === 'sqlite') {
      // SQLite does not support adding check constraints after table creation.
      // This constraint is enforced only in Postgres.
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    await queryInterface.changeColumn('audit_logs', 'createdAt', {
      type: Sequelize.DATE,
      allowNull: false,
    });
    await queryInterface.changeColumn('audit_logs', 'updatedAt', {
      type: Sequelize.DATE,
      allowNull: false,
    });

    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE audit_logs
        DROP CONSTRAINT IF EXISTS audit_logs_immutable_check;
      `);
    } else if (dialect === 'sqlite') {
      // No-op: nothing to drop in SQLite.
    }
  },
};
