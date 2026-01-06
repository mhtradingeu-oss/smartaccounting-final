'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('file_attachments');

    if (!table.attached_to_type) {
      await queryInterface.addColumn('file_attachments', 'attached_to_type', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'unknown',
      });
    }

    if (!table.attached_to_id) {
      await queryInterface.addColumn('file_attachments', 'attached_to_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('file_attachments');

    if (table.attached_to_type) {
      await queryInterface.removeColumn('file_attachments', 'attached_to_type');
    }

    if (table.attached_to_id) {
      await queryInterface.removeColumn('file_attachments', 'attached_to_id');
    }
  },
};
