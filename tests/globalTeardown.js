const { closeDatabase } = require('../src/lib/database');

module.exports = async () => {
  await closeDatabase();
};
