
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite::memory:';
const { sequelize } = require('../src/models');

module.exports = async () => {
  // Set test environment
  process.env.DB_NAME = 'smartaccounting_test';
  
  // Create test database
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    process.exit(1);
  }
};
