'use strict';

// 20251229102000-align-activetoken-revokedtoken-id.js
// Adds id column to ActiveToken and RevokedToken for model/DB alignment

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ActiveToken
    const activeTable = await queryInterface.describeTable('active_tokens');
    if (!activeTable.id) {
      await queryInterface.addColumn('active_tokens', 'id', {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      });
    }
    // RevokedToken
    const revokedTable = await queryInterface.describeTable('revoked_tokens');
    if (!revokedTable.id) {
      await queryInterface.addColumn('revoked_tokens', 'id', {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      });
    }
  },
  down: async (_queryInterface) => {
    // Do not drop id columns for safety
  },
};
