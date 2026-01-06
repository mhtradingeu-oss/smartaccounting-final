'use strict';

/**
 * Fix attached_to_id type for file_attachments.
 * Ensures attached_to_id is UUID (never INTEGER).
 * Safe for Postgres and SQLite.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('file_attachments');

    if (table.attached_to_id && table.attached_to_id.type === 'INTEGER') {
      await queryInterface.addColumn('file_attachments', 'attached_to_id_uuid', {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Polymorphic attachment id (UUID, fixed)',
      });

      await queryInterface.sequelize.query(
        'UPDATE "file_attachments" SET "attached_to_id_uuid" = NULL',
      );

      await queryInterface.removeColumn('file_attachments', 'attached_to_id');

      await queryInterface.renameColumn(
        'file_attachments',
        'attached_to_id_uuid',
        'attached_to_id',
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('file_attachments');

    if (table.attached_to_id && table.attached_to_id.type === 'UUID') {
      await queryInterface.removeColumn('file_attachments', 'attached_to_id');

      await queryInterface.addColumn('file_attachments', 'attached_to_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reverted polymorphic id (INTEGER)',
      });
    }
  },
};
