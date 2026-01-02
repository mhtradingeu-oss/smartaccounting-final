const { Sequelize } = require('sequelize');
let sequelizeInstance = null;

function getSequelize() {
  if (sequelizeInstance) {
    return sequelizeInstance;
  }
  if (global.__SEQUELIZE_SINGLETON__) {
    throw new Error('Sequelize instance already initialized elsewhere!');
  }
  // Example config, replace with your config logic
  const NODE_ENV = process.env.NODE_ENV || 'development';
  let databaseUrl;
  if (NODE_ENV === 'test') {
    databaseUrl = 'sqlite::memory:';
  } else {
    databaseUrl = process.env.DATABASE_URL;
  }
  sequelizeInstance = new Sequelize(databaseUrl, {
    logging: false,
  });
  global.__SEQUELIZE_SINGLETON__ = sequelizeInstance;
  return sequelizeInstance;
}

module.exports = { getSequelize };
