'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'sqlite') {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS ai_insight_decisions (
          id TEXT PRIMARY KEY,
          insightId TEXT NOT NULL,
          companyId INTEGER NOT NULL,
          actorUserId INTEGER NOT NULL,
          decision TEXT NOT NULL,
          reason TEXT,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        );
      `);
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS ai_insight_decisions_company_created_at ON ai_insight_decisions (companyId, createdAt);',
      );
      await queryInterface.sequelize.query(
        'CREATE INDEX IF NOT EXISTS ai_insight_decisions_insight_id ON ai_insight_decisions (insightId);',
      );
      return;
    }

    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    await queryInterface.createTable('ai_insight_decisions', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      insightId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ai_insights',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      actorUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      decision: {
        type: Sequelize.ENUM('accepted', 'rejected', 'overridden'),
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('ai_insight_decisions', ['companyId', 'createdAt']);
    await queryInterface.addIndex('ai_insight_decisions', ['insightId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ai_insight_decisions');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ai_insight_decisions_decision";',
    );
  },
};
