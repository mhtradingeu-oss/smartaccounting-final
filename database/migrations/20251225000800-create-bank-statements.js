'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bank_statements', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      statementDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      openingBalance: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      closingBalance: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
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
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('bank_statements', ['companyId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('bank_statements');
  },
};
