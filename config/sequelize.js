// Prevent accidental production migrations
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_MIGRATION) {
  throw new Error('Production migrations require ALLOW_PROD_MIGRATION=true');
}
const path = require('path');
const { createDatabaseConfig } = require('../src/config/database');

const buildEnvConfig = (targetEnv, overrideDbConfig) => {
  const dbConfig = overrideDbConfig || createDatabaseConfig(targetEnv);

  // SQLITE (runtime/CI) for sqlite-backed tests
  if (dbConfig.isTest && dbConfig.isSqlite) {
    return {
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      benchmark: false,
    };
  }

  if (dbConfig.isSqlite) {
    const sqliteStorage =
      dbConfig.storage ||
      (dbConfig.databaseUrl === 'sqlite::memory:'
        ? ':memory:'
        : dbConfig.databaseUrl.replace('sqlite:', ''));

    return {
      dialect: 'sqlite',
      storage: sqliteStorage,
      logging: dbConfig.logging ?? false,
      benchmark: dbConfig.benchmark ?? false,
    };
  }

  // POSTGRES
  return {
    dialect: 'postgres',
    url: dbConfig.databaseUrl,
    pool: dbConfig.pool,
    logging: dbConfig.logging ?? false,
    dialectOptions: dbConfig.dialectOptions,
    benchmark: dbConfig.benchmark ?? false,
  };
};

const buildPostgresConfig = (dbConfig) => ({
  dialect: 'postgres',
  url: dbConfig.databaseUrl,
  pool: dbConfig.pool,
  logging: dbConfig.logging ?? false,
  dialectOptions: dbConfig.dialectOptions,
  benchmark: dbConfig.benchmark ?? false,
});

const testDbConfig = createDatabaseConfig('test');
const testConfig = testDbConfig.isSqlite
  ? buildEnvConfig('test', testDbConfig)
  : buildPostgresConfig(testDbConfig);

module.exports = {
  // 👇 NEW: explicit sqlite env for sequelize-cli
  sqlite: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../.data/dev.sqlite'),
    logging: false,
  },

  development: buildEnvConfig('development'),
  test: testConfig,
  production: buildEnvConfig('production'),
};
