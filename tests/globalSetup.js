module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'sqlite::memory:';
  const { connectDatabase } = require('../src/lib/database');
  await connectDatabase('test');
};
