const { sequelize } = require('../src/models');

module.exports = async () => {
  if (sequelize && !sequelize._closed) {
    await sequelize.close();
  }
};
