module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'sqlite::memory:';
  const { sequelize } = require('../src/models');
  await sequelize.authenticate();
};
