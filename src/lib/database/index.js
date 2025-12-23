const { Sequelize, DataTypes } = require('sequelize');
const { createDatabaseConfig } = require('../../config/database');

const dbConfig = createDatabaseConfig();
const {
  databaseUrl,
  pool,
  logging: configLogging,
  dialectOptions,
  define,
  storage,
  NODE_ENV,
  isSqlite,
  isInMemorySqlite,
} = dbConfig;

const sequelizeOptions = {
  pool,
  dialectOptions,
  define,
  logging: NODE_ENV === 'test' ? false : configLogging,
};

if (storage) {
  sequelizeOptions.storage = storage;
}

let sequelize;
if (isSqlite) {
  const sqliteOptions = {
    ...sequelizeOptions,
    dialect: 'sqlite',
    storage: storage || (isInMemorySqlite ? ':memory:' : undefined),
  };
  sequelize = new Sequelize(sqliteOptions);
} else {
  sequelize = new Sequelize(databaseUrl, sequelizeOptions);
}

module.exports = {
  sequelize,
  Sequelize,
  DataTypes,
};
