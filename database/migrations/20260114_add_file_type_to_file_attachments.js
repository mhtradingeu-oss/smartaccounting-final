'use strict';

/**
 * Migration: add file_type to file_attachments
 * Adds the missing file_type column to file_attachments table (TEXT, nullable)
 */

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    await queryInterface.addColumn('file_attachments', 'file_type', {
      type: _Sequelize.STRING,
      allowNull: true,
      comment: 'MIME type or file category (optional)',
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.removeColumn('file_attachments', 'file_type');
  },
};
