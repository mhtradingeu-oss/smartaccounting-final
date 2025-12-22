const { closeDatabase } = require('../src/lib/database');

module.exports = async () => {
  if (process.env.CI) {
    console.log('Active handles:', process._getActiveHandles().length);
  }

  await closeDatabase();
};
