const { sequelize } = require('../src/models');

module.exports = async () => {
  if (process.env.CI) {
    console.log('Active handles:', process._getActiveHandles().length);
  }

  await sequelize.close();
};
