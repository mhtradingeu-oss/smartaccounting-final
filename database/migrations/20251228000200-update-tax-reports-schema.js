'use strict';

const TAX_REPORT_STATUS_ENUM = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('tax_reports', 'type', 'reportType');
    await queryInterface.changeColumn('tax_reports', 'period', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        'ALTER TABLE "tax_reports" ALTER COLUMN "status" DROP DEFAULT;',
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE "tax_reports" ALTER COLUMN "status" TYPE VARCHAR USING "status"::VARCHAR;',
      );
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tax_reports_status";');
    }

    await queryInterface.changeColumn('tax_reports', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'draft',
    });

    await queryInterface.addColumn('tax_reports', 'year', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('tax_reports', 'data', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
    });
    await queryInterface.addColumn('tax_reports', 'generatedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('tax_reports', 'submittedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('tax_reports', 'submittedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('tax_reports', 'elsterStatus', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('tax_reports', 'elsterTransferTicket', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tax_reports', 'elsterTransferTicket');
    await queryInterface.removeColumn('tax_reports', 'elsterStatus');
    await queryInterface.removeColumn('tax_reports', 'submittedBy');
    await queryInterface.removeColumn('tax_reports', 'submittedAt');
    await queryInterface.removeColumn('tax_reports', 'generatedAt');
    await queryInterface.removeColumn('tax_reports', 'data');
    await queryInterface.removeColumn('tax_reports', 'year');

    await queryInterface.changeColumn('tax_reports', 'period', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_tax_reports_status" AS ENUM(${TAX_REPORT_STATUS_ENUM.map((s) => `'${s}'`).join(', ')});`,
      );
    }

    await queryInterface.changeColumn('tax_reports', 'status', {
      type: Sequelize.ENUM(...TAX_REPORT_STATUS_ENUM),
      allowNull: false,
      defaultValue: 'DRAFT',
    });

    await queryInterface.renameColumn('tax_reports', 'reportType', 'type');
  },
};
