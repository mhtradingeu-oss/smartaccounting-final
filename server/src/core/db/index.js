const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🛡 ROUTED SAFE QUERY LAYER
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.warn('[DB FALLBACK ACTIVE]', err.message);

    return {
      rows: [],
      fallback: true,
      error: err.message,
    };
  }
}

module.exports = {
  query,
  pool,
};
