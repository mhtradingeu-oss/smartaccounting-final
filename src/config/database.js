const { Sequelize } = require('sequelize');

const parseNumberEnv = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

function createDatabaseConfig(targetEnv) {
  const envName = targetEnv || process.env.NODE_ENV || 'development';
  const normalizedEnv = String(envName).trim().toLowerCase();
  const isTestEnv = normalizedEnv === 'test';
  const forceSqlite =
    process.env.USE_SQLITE !== undefined
      ? process.env.USE_SQLITE === 'true'
      : isTestEnv;
  const databaseUrl = process.env.DATABASE_URL;
  const storage =
    process.env.SQLITE_STORAGE ||
    (isTestEnv ? ':memory:' : undefined) ||
    (databaseUrl && databaseUrl.startsWith('sqlite:') ? databaseUrl.replace('sqlite:', '') : undefined);
  const poolConfig = {
    max: parseNumberEnv(process.env.DB_POOL_MAX),
    min: parseNumberEnv(process.env.DB_POOL_MIN),
    acquire: parseNumberEnv(process.env.DB_POOL_ACQUIRE),
    idle: parseNumberEnv(process.env.DB_POOL_IDLE),
  };
  const hasPool = Object.values(poolConfig).some((value) => value !== undefined);
  const dialectOptions =
    process.env.DB_SSL === 'true'
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: process.env.DB_SSL_STRICT === 'false' ? false : true,
          },
        }
      : undefined;

  return {
    env: normalizedEnv,
    isTest: isTestEnv,
    isSqlite: forceSqlite || (databaseUrl && databaseUrl.startsWith('sqlite:')),
    storage,
    databaseUrl,
    logging: process.env.SEQUELIZE_LOGGING === 'true' ? console.log : false,
    pool: hasPool ? poolConfig : undefined,
    dialectOptions,
  };
}

function getSequelize(targetEnv) {
  if (global.__SEQUELIZE_SINGLETON__ && global.__SEQUELIZE_SINGLETON__ instanceof Sequelize) {
    return global.__SEQUELIZE_SINGLETON__;
  }

  const dbConfig = createDatabaseConfig(targetEnv);
  let sequelize;

  if (dbConfig.isSqlite) {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbConfig.storage || ':memory:',
      logging: false,
    });
  } else {
    if (!dbConfig.databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    sequelize = new Sequelize(dbConfig.databaseUrl, {
      logging: dbConfig.logging ?? false,
      pool: dbConfig.pool,
      dialectOptions: dbConfig.dialectOptions,
    });
  }

  global.__SEQUELIZE_SINGLETON__ = sequelize;
  return sequelize;
}

module.exports = {
  createDatabaseConfig,
  getSequelize,
};
