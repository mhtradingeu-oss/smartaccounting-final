/**
 * ENTERPRISE IDEMPOTENCY STORE
 * Prevents duplicate financial execution
 */

const store = new Map();

/**
 * key format:
 * {type}:{entityId}:{companyId}
 */

function generateKey(type, payload, context = {}) {
  return `${type}:${payload.entityId || 'na'}:${context.companyId || 'global'}`;
}

function exists(key) {
  return store.has(key);
}

function set(key, value) {
  store.set(key, {
    ...value,
    createdAt: new Date().toISOString(),
  });
}

function get(key) {
  return store.get(key);
}

module.exports = {
  generateKey,
  exists,
  set,
  get,
};
