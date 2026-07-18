'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();

    await queryInterface.createTable('accounting_periods', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: dialect === 'postgres' ? Sequelize.ENUM('OPEN', 'CLOSED') : Sequelize.STRING,
        allowNull: false,
        defaultValue: 'OPEN',
      },
      closedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      closedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reopenedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reopenedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('accounting_periods', ['companyId', 'startDate', 'endDate'], {
      unique: true,
      name: 'accounting_period_company_date_unique',
    });

    await queryInterface.addIndex('accounting_periods', ['companyId', 'status', 'startDate', 'endDate'], {
      name: 'accounting_period_lookup',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('accounting_periods');

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_accounting_periods_status";',
      );
    }
  },
};
