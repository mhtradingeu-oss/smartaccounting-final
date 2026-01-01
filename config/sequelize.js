// Prevent accidental production migrations
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_MIGRATION) {
  throw new Error('Production migrations require ALLOW_PROD_MIGRATION=true');
}
const path = require('path');
const { createDatabaseConfig } = require('../src/config/database');

const buildEnvConfig = (targetEnv) => {
  const dbConfig = createDatabaseConfig(targetEnv);

  // ✅ SQLITE (runtime, not CLI)
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
    };
  }

  // ✅ POSTGRES
  return {
    dialect: 'postgres',
    url: dbConfig.databaseUrl,
    pool: dbConfig.pool,
    logging: dbConfig.logging ?? false,
    dialectOptions: dbConfig.dialectOptions,
  };
};

module.exports = {
  // 👇 NEW: explicit sqlite env for sequelize-cli
  sqlite: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../.data/dev.sqlite'),
    logging: false,
  },

  development: buildEnvConfig('development'),
  test: buildEnvConfig('test'),
  production: buildEnvConfig('production'),
};
