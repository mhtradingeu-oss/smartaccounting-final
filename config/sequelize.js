const { createDatabaseConfig } = require('../src/config/database');

const buildEnvConfig = (targetEnv) => {
  const dbConfig = createDatabaseConfig(targetEnv);

  // ✅ SQLITE (DEV / TEST)
  if (dbConfig.isSqlite) {
    return {
      dialect: 'sqlite',
      url: dbConfig.databaseUrl,
      logging: dbConfig.logging ?? false,
    };
  }

  // ✅ POSTGRES (PRODUCTION ONLY)
  return {
    dialect: 'postgres',
    url: dbConfig.databaseUrl,
    pool: dbConfig.pool,
    logging: dbConfig.logging ?? false,
    dialectOptions: dbConfig.dialectOptions,
  };
};

module.exports = {
  development: buildEnvConfig('development'),
  test: buildEnvConfig('test'),
  production: buildEnvConfig('production'),
};
