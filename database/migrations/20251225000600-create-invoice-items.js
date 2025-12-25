'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('InvoiceItems', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      invoiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'invoices',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      unitPrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      vatRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      lineNet: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      lineVat: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      lineGross: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('InvoiceItems', ['invoiceId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('InvoiceItems');
  },
};
