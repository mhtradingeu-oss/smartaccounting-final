const { Sequelize } = require('sequelize');
const logger = require('../lib/logger');

const parseNumberEnv = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500;

const sanitizeSql = (sql) => {
  if (typeof sql !== 'string') {
    return '';
  }

  return sql.replace(/\s+/g, ' ').trim().slice(0, 1024);
};

const buildSequelizeLoggingOptions = (isTestEnv) => {
  const rawThreshold = process.env.LOG_SLOW_QUERY_MS;
  let threshold;

  if (rawThreshold === undefined || rawThreshold === null) {
    threshold = DEFAULT_SLOW_QUERY_THRESHOLD_MS;
  } else {
    const parsed = parseNumberEnv(rawThreshold);
    threshold = parsed === undefined ? DEFAULT_SLOW_QUERY_THRESHOLD_MS : parsed;
  }

  const logAllQueries = process.env.SEQUELIZE_LOGGING === 'true';
  const shouldLogSlowQueries = !isTestEnv && threshold > 0;

  if (logAllQueries) {
    return {
      logging: (sql, timing) => {
        logger.debug('Database query executed', {
          sql: sanitizeSql(sql),
          durationMs: typeof timing === 'number' ? Number(timing.toFixed(2)) : undefined,
        });
      },
      benchmark: true,
    };
  }

  if (shouldLogSlowQueries) {
    return {
      logging: (sql, timing) => {
        if (typeof timing !== 'number') {
          return;
        }
        if (timing >= threshold) {
          logger.performance('Slow database query', {
            sql: sanitizeSql(sql),
            durationMs: Number(timing.toFixed(2)),
            thresholdMs: threshold,
          });
        }
      },
      benchmark: true,
    };
  }

  return {
    logging: false,
    benchmark: false,
  };
};

function createDatabaseConfig(targetEnv) {
  const envName = targetEnv || process.env.NODE_ENV || 'development';
  const normalizedEnv = String(envName).trim().toLowerCase();
  const isTestEnv = normalizedEnv === 'test';
  const forceSqlite =
    process.env.USE_SQLITE !== undefined ? process.env.USE_SQLITE === 'true' : isTestEnv;
  const databaseUrl = process.env.DATABASE_URL;
  const storage =
    process.env.SQLITE_STORAGE ||
    (isTestEnv ? ':memory:' : undefined) ||
    (databaseUrl && databaseUrl.startsWith('sqlite:')
      ? databaseUrl.replace('sqlite:', '')
      : undefined);
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

  const loggingOptions = buildSequelizeLoggingOptions(isTestEnv);

  const config = {
    env: normalizedEnv,
    isTest: isTestEnv,
    isSqlite: forceSqlite || (databaseUrl && databaseUrl.startsWith('sqlite:')),
    storage,
    databaseUrl,
    logging: loggingOptions.logging,
    benchmark: loggingOptions.benchmark,
    pool: hasPool ? poolConfig : undefined,
    dialectOptions,
  };
  // Debug print for storage path
  if (config.isSqlite) {
    // eslint-disable-next-line no-console
    console.log('[DB]', normalizedEnv, 'sqlite storage =', config.storage);
  }
  return config;
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
      logging: dbConfig.logging ?? false,
      benchmark: dbConfig.benchmark ?? false,
    });
  } else {
    if (!dbConfig.databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    sequelize = new Sequelize(dbConfig.databaseUrl, {
      logging: dbConfig.logging ?? false,
      benchmark: dbConfig.benchmark ?? false,
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
