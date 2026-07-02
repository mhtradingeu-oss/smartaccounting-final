const pg = require('../index');

function query(text, params) {
  try {
    return pg.query(text, params);
  } catch (err) {
    console.warn('[DB FALLBACK MODE]', err.message);

    return Promise.resolve({
      rows: [],
      fallback: true,
    });
  }
}

module.exports = { query };
