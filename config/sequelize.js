// Unified Sequelize CLI config.
// Each environment is resolved lazily so loading the development config
// cannot accidentally evaluate the protected PostgreSQL test configuration.
const { createDatabaseConfig } = require('../src/config/database');

function getDatabaseConfig(env) {
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

const sequelizeConfig = {};

for (const env of ['development', 'test', 'production']) {
  Object.defineProperty(sequelizeConfig, env, {
    enumerable: true,
    configurable: false,
    get() {
      return getDatabaseConfig(env);
    },
  });
}

module.exports = sequelizeConfig;
