'use strict';

// 20251229100000-add-missing-aiinsight-columns.js
// Adds missing columns to ai_insights table safely (ALL dialects, schema-safe)

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    let table;
    try {
      // 🔒 Schema-safe: works for Postgres & SQLite
      table = await queryInterface.describeTable('ai_insights');
    } catch (err) {
      console.log('[SKIP] ai_insights table not found – skipping column additions');
      return;
    }

    const addColumnIfMissing = async (name, definition) => {
      if (!table[name]) {
        await queryInterface.addColumn('ai_insights', name, definition);
      }
    };

    await addColumnIfMissing('legalContext', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await addColumnIfMissing('evidence', {
      type: dialect === 'sqlite' ? Sequelize.TEXT : Sequelize.JSONB,
      allowNull: true,
    });

    await addColumnIfMissing('ruleId', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addColumnIfMissing('modelVersion', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addColumnIfMissing('featureFlag', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await addColumnIfMissing('disclaimer', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down() {
    // 🚫 No destructive rollback (production-safe additive migration)
  },
};
