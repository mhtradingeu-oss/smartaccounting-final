const path = require('path');
require('dotenv').config();

const projectRoot = path.resolve(__dirname, '..', '..');
const resolveRelativeToRoot = (value) =>
  path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
const defaultSqliteStorage = resolveRelativeToRoot(process.env.SQLITE_STORAGE_PATH || 'database/dev.sqlite');

const createDatabaseConfig = (envOverride) => {
  const NODE_ENV = envOverride || process.env.NODE_ENV || 'development';
  const isTest = NODE_ENV === 'test';
  const explicitUrl = process.env.DATABASE_URL;
  const useSqlite = process.env.USE_SQLITE === 'true';

  if (useSqlite && explicitUrl && !isTest) {
    throw new Error('USE_SQLITE=true cannot be combined with DATABASE_URL outside of tests');
  }

  let databaseUrl;
  if (useSqlite) {
    databaseUrl = isTest ? 'sqlite::memory:' : `sqlite:${defaultSqliteStorage}`;
  } else if (explicitUrl) {
    databaseUrl = explicitUrl;
  } else {
    throw new Error('No database configuration provided; set USE_SQLITE=true or define DATABASE_URL.');
  }

  const isSqlite = databaseUrl.startsWith('sqlite:');
  const isInMemorySqlite = databaseUrl === 'sqlite::memory:';

  let storage;
  if (isSqlite && !isInMemorySqlite) {
    const rawPath = databaseUrl.replace('sqlite:', '');
    storage = resolveRelativeToRoot(rawPath);
  }

  const pool = {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    acquire: Number(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: Number(process.env.DB_POOL_IDLE) || 10000,
  };

  const logging = process.env.SEQUELIZE_LOGGING === 'true' || NODE_ENV === 'development';

  const dialectOptions = {};
  if (!isSqlite && process.env.DB_SSL === 'true') {
    dialectOptions.ssl = {
      require: true,
      rejectUnauthorized: false,
    };
  }

  return {
    NODE_ENV,
    databaseUrl,
    isTest,
    isSqlite,
    storage,
    pool,
    logging,
    dialectOptions,
    define: {
      timestamps: true,
      underscored: false,
    },
  };
};

const config = createDatabaseConfig();

module.exports = config;
module.exports.createDatabaseConfig = createDatabaseConfig;
