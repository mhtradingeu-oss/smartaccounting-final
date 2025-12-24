module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('file_attachments', 'expense_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'expenses',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('file_attachments', 'invoice_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'invoices',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('file_attachments', 'invoice_id');
    await queryInterface.removeColumn('file_attachments', 'expense_id');
  },
};
