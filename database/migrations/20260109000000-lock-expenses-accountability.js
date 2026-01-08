'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'sqlite') {
      // SQLite does not support altering columns to add constraints after creation; skip.
      return;
    }
    await queryInterface.changeColumn('expenses', 'createdByUserId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.changeColumn('expenses', 'netAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    });
    await queryInterface.changeColumn('expenses', 'vatAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    });
    await queryInterface.changeColumn('expenses', 'grossAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
    });
    await queryInterface.changeColumn('expenses', 'vatRate', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'sqlite') {
      // SQLite does not support altering columns to add constraints after creation; skip.
      return;
    }
    await queryInterface.changeColumn('expenses', 'createdByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.changeColumn('expenses', 'netAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn('expenses', 'vatAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn('expenses', 'grossAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });
    await queryInterface.changeColumn('expenses', 'vatRate', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
    });
  },
};
