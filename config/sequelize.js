// Unified config: use getDatabaseConfig from src/config/database.js
const { createDatabaseConfig } = require('../src/config/database');

function getDatabaseConfig(env) {
  // This function returns a config object compatible with sequelize-cli
  const config = createDatabaseConfig(env);
  if (config.isSqlite) {
    return {
      dialect: 'sqlite',
      storage: config.storage || ':memory:',
      logging: false,
    };
  }
  return {
    dialect: 'postgres',
    url: config.databaseUrl,
    pool: config.pool,
    logging: false,
    dialectOptions: config.dialectOptions,
  };
}

module.exports = {
  development: getDatabaseConfig('development'),
  test: getDatabaseConfig('test'),
  production: getDatabaseConfig('production'),
};
