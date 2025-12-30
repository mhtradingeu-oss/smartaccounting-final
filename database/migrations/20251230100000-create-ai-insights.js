'use strict';

// 20251230100000-create-ai-insights.js
// Guaranteed creation of ai_insights for SQLite & Postgres

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'sqlite') {
      // 🔒 SQLite: raw SQL to avoid transaction visibility issues
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS ai_insights (
          id TEXT PRIMARY KEY,
          companyId INTEGER NOT NULL,
          entityType VARCHAR(32) NOT NULL,
          entityId TEXT NOT NULL,
          type TEXT NOT NULL,
          severity VARCHAR(32) NOT NULL,
          confidenceScore REAL NOT NULL,
          summary TEXT NOT NULL,
          why TEXT NOT NULL,
          legalContext TEXT NOT NULL,
          evidence TEXT NOT NULL,
          ruleId TEXT NOT NULL,
          modelVersion TEXT NOT NULL,
          featureFlag TEXT NOT NULL,
          disclaimer TEXT NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        );
      `);
      return;
    }

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // ✅ Postgres
    await queryInterface.createTable('ai_insights', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
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
      entityType: {
        type: Sequelize.ENUM('invoice', 'expense', 'bankTransaction', 'taxReport', 'user'),
        allowNull: false,
      },
      entityId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: false,
      },
      confidenceScore: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      why: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      legalContext: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      evidence: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      ruleId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      modelVersion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      featureFlag: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      disclaimer: {
        type: Sequelize.STRING,
        allowNull: false,
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

    await queryInterface.addIndex('ai_insights', ['companyId', 'createdAt']);
    await queryInterface.addIndex('ai_insights', ['companyId', 'type']);
    await queryInterface.addIndex('ai_insights', ['entityId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_insights');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ai_insights_entityType";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ai_insights_severity";',
    );
  },
};
