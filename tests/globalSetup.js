module.exports = async () => {
  process.env.NODE_ENV = 'test';
  if (typeof process.env.USE_SQLITE === 'undefined') {
    process.env.USE_SQLITE = 'true';
  }
  if (process.env.USE_SQLITE === 'true') {
    delete process.env.DATABASE_URL;
  }
  const { sequelize } = require('../src/models');
  await sequelize.authenticate();
};
