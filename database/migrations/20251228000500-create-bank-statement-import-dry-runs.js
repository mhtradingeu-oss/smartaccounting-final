'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bank_statement_import_dry_runs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      bankStatementId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bank_statements',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      confirmationToken: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      filePath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fileFormat: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      summary: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      totalTransactions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      processedTransactions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      matches: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unmatched: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      warnings: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      confirmedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('bank_statement_import_dry_runs');
  },
};
