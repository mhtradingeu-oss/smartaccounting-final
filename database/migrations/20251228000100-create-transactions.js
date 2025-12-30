'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    }
    await queryInterface.createTable('transactions', {
      id:
        dialect === 'sqlite'
          ? { type: Sequelize.STRING, primaryKey: true, allowNull: false }
          : {
              type: Sequelize.UUID,
              defaultValue: Sequelize.literal('gen_random_uuid()'),
              primaryKey: true,
              allowNull: false,
            },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'EUR',
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'expense',
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      vat_rate: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        defaultValue: 0,
      },
      vat_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      non_deductible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      credit_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      debit_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      is_reconciled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      bank_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bank_transactions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('transactions', ['company_id']);
    await queryInterface.addIndex('transactions', ['bank_transaction_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('transactions');
  },
};
