'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('invoices', 'dueDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('invoices', 'clientName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('invoices', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('expenses', 'createdByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addColumn('expenses', 'vendorName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'expenseDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'category', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'netAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'vatRate', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'vatAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'grossAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('expenses', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'draft',
    });
    await queryInterface.addColumn('expenses', 'source', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'manual',
    });

    await queryInterface.addColumn('bank_statements', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('bank_statements', 'bankName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_statements', 'accountNumber', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'UNKNOWN',
    });
    await queryInterface.addColumn('bank_statements', 'iban', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_statements', 'fileName', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('bank_statements', 'fileFormat', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('bank_statements', 'filePath', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_statements', 'statementPeriodStart', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_statements', 'statementPeriodEnd', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_statements', 'currency', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'EUR',
    });
    await queryInterface.addColumn('bank_statements', 'totalTransactions', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn('bank_statements', 'processedTransactions', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn('bank_statements', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'PROCESSING',
    });
    await queryInterface.addColumn('bank_statements', 'importDate', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('bank_statements', 'importDate');
    await queryInterface.removeColumn('bank_statements', 'status');
    await queryInterface.removeColumn('bank_statements', 'processedTransactions');
    await queryInterface.removeColumn('bank_statements', 'totalTransactions');
    await queryInterface.removeColumn('bank_statements', 'currency');
    await queryInterface.removeColumn('bank_statements', 'statementPeriodEnd');
    await queryInterface.removeColumn('bank_statements', 'statementPeriodStart');
    await queryInterface.removeColumn('bank_statements', 'filePath');
    await queryInterface.removeColumn('bank_statements', 'fileFormat');
    await queryInterface.removeColumn('bank_statements', 'fileName');
    await queryInterface.removeColumn('bank_statements', 'iban');
    await queryInterface.removeColumn('bank_statements', 'accountNumber');
    await queryInterface.removeColumn('bank_statements', 'bankName');
    await queryInterface.removeColumn('bank_statements', 'userId');

    await queryInterface.removeColumn('expenses', 'source');
    await queryInterface.removeColumn('expenses', 'status');
    await queryInterface.removeColumn('expenses', 'grossAmount');
    await queryInterface.removeColumn('expenses', 'notes');
    await queryInterface.removeColumn('expenses', 'vatAmount');
    await queryInterface.removeColumn('expenses', 'vatRate');
    await queryInterface.removeColumn('expenses', 'netAmount');
    await queryInterface.removeColumn('expenses', 'category');
    await queryInterface.removeColumn('expenses', 'expenseDate');
    await queryInterface.removeColumn('expenses', 'vendorName');
    await queryInterface.removeColumn('expenses', 'createdByUserId');

    await queryInterface.removeColumn('invoices', 'notes');
    await queryInterface.removeColumn('invoices', 'clientName');
    await queryInterface.removeColumn('invoices', 'dueDate');
  },
};
