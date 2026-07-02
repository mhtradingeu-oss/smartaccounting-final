const fs = require('fs');
const path = require('path');
const db = require('./index');

async function runMigrations() {
  const file = fs.readFileSync(
    path.join(__dirname, 'migrations/001_init_schema.sql'),
    'utf8',
  );

  await db.query(file);
  console.log('✅ Database schema initialized successfully');
}

module.exports = { runMigrations };
