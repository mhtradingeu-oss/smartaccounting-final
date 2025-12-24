module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_logs', 'correlationId', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('audit_logs', 'correlationId');
  },
};
