'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bank_transactions', 'value_date', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_transactions', 'transaction_type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'DEBIT',
    });
    await queryInterface.addColumn('bank_transactions', 'reference', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_transactions', 'category', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_transactions', 'vat_category', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_transactions', 'counterparty_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_transactions', 'is_reconciled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('bank_transactions', 'reconciled_with', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'transactions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('bank_transactions', 'reconciled_with');
    await queryInterface.removeColumn('bank_transactions', 'is_reconciled');
    await queryInterface.removeColumn('bank_transactions', 'counterparty_name');
    await queryInterface.removeColumn('bank_transactions', 'vat_category');
    await queryInterface.removeColumn('bank_transactions', 'category');
    await queryInterface.removeColumn('bank_transactions', 'reference');
    await queryInterface.removeColumn('bank_transactions', 'transaction_type');
    await queryInterface.removeColumn('bank_transactions', 'value_date');
  },
};
