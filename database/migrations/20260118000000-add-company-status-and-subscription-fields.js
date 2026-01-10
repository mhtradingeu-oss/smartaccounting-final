'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('companies', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn('companies', 'suspendedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('companies', 'subscriptionPlan', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('companies', 'subscriptionStatus', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('companies', 'stripeSubscriptionId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('companies', 'stripeSubscriptionId');
    await queryInterface.removeColumn('companies', 'subscriptionStatus');
    await queryInterface.removeColumn('companies', 'subscriptionPlan');
    await queryInterface.removeColumn('companies', 'suspendedAt');
    await queryInterface.removeColumn('companies', 'isActive');
  },
};
