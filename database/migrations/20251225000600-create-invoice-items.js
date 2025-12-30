'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    }
    await queryInterface.createTable('InvoiceItems', {
      id:
        dialect === 'sqlite'
          ? { type: Sequelize.STRING, primaryKey: true }
          : {
              type: Sequelize.UUID,
              defaultValue: Sequelize.literal('gen_random_uuid()'),
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
        type: Sequelize.DECIMAL(5, 4),
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
