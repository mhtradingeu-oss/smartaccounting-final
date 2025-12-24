module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('audit_logs', 'reason', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'system',
    });
    await queryInterface.addColumn('audit_logs', 'hash', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('audit_logs', 'previousHash', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('audit_logs', 'immutable', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('audit_logs', 'immutable');
    await queryInterface.removeColumn('audit_logs', 'previousHash');
    await queryInterface.removeColumn('audit_logs', 'hash');
    await queryInterface.removeColumn('audit_logs', 'reason');
  },
};
