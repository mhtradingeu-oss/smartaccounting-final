"use strict";

// 20260113120000-add-purpose-column-aiinsights.js
// Adds 'purpose' column to ai_insights table (all dialects, schema-safe)

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    let table;
    try {
      table = await queryInterface.describeTable("ai_insights");
    } catch (err) {
      console.log("[SKIP] ai_insights table not found – skipping 'purpose' column addition");
      return;
    }
    if (!table["purpose"]) {
      await queryInterface.addColumn("ai_insights", "purpose", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down() {
    // 🚫 No destructive rollback (production-safe additive migration)
  },
};
