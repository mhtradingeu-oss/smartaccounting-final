'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create invoice_payments table
    // Cross-dialect UUID support
    const dialect = queryInterface.sequelize.getDialect();
    await queryInterface.createTable('invoice_payments', {
      id: {
        type: dialect === 'postgres' ? Sequelize.UUID : Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
        defaultValue: dialect === 'postgres' ? Sequelize.literal('gen_random_uuid()') : undefined,
      },
      invoiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'invoices',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      method: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: dialect === 'postgres' ? Sequelize.literal('CURRENT_TIMESTAMP') : new Date(),
      },
    });
    // Add paidAmount and remainingAmount to invoices
    await queryInterface.addColumn('invoices', 'paidAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('invoices', 'remainingAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('invoices', 'paidAmount');
    await queryInterface.removeColumn('invoices', 'remainingAmount');
    await queryInterface.dropTable('invoice_payments');
  },
};
