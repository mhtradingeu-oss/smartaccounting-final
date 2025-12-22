module.exports = async () => {
  // CI / Jest bootstrap: do not initialize Sequelize models or hit the database.
  process.env.NODE_ENV = 'test';
};
