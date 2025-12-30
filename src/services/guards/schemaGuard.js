// src/services/guards/schemaGuard.js
// Runtime schema guard for optional modules (AI, OCR, etc.)
const { sequelize } = require('../../models');

// In-memory cache for schema checks
const _cache = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function checkTableAndColumns(table, columns = []) {
  const cacheKey = `${table}:${columns.join(',')}`;
  const now = Date.now();
  if (_cache[cacheKey] && now - _cache[cacheKey].ts < CACHE_TTL_MS) {
    return _cache[cacheKey].ok;
  }
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes(table)) {
      _cache[cacheKey] = { ok: false, ts: now };
      return false;
    }
    if (!columns.length) {
      _cache[cacheKey] = { ok: true, ts: now };
      return true;
    }
    const desc = await sequelize.getQueryInterface().describeTable(table);
    for (const col of columns) {
      if (!desc[col]) {
        _cache[cacheKey] = { ok: false, ts: now };
        return false;
      }
    }
    _cache[cacheKey] = { ok: true, ts: now };
    return true;
  } catch (err) {
    _cache[cacheKey] = { ok: false, ts: now };
    return false;
  }
}

function clearSchemaCache() {
  Object.keys(_cache).forEach((key) => {
    delete _cache[key];
  });
}

module.exports = { checkTableAndColumns, clearSchemaCache };
