'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // SQLite compatibility: Gate Postgres-only features
    const dialect = queryInterface.sequelize.getDialect();
    const isSqlite = dialect === 'sqlite';
    if (dialect === 'postgres') {
      // Ensure pgcrypto is enabled for gen_random_uuid()
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    }
    await queryInterface.createTable('bank_statement_import_dry_runs', {
      id: isSqlite
        ? { type: Sequelize.STRING, primaryKey: true } // SQLite: use TEXT for UUID
        : {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        ...(isSqlite
          ? {} // SQLite: skip FK constraints
          : {
              references: { model: 'companies', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            }),
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        ...(isSqlite
          ? {}
          : {
              references: { model: 'users', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            }),
      },
      bankStatementId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        ...(isSqlite
          ? {}
          : {
              references: { model: 'bank_statements', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            }),
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
        type: isSqlite ? Sequelize.TEXT : Sequelize.JSON, // SQLite: store JSON as TEXT
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
        ...(isSqlite ? {} : { defaultValue: Sequelize.fn('NOW') }),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        ...(isSqlite ? {} : { defaultValue: Sequelize.fn('NOW') }),
      },
    });
    // End SQLite compatibility
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('bank_statement_import_dry_runs');
  },
};
