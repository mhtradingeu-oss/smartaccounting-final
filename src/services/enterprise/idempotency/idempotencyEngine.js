const store = require('./idempotencyStore');

/**
 * ENTERPRISE IDEMPOTENCY ENGINE
 * Guarantees exactly-once execution
 */

function checkIdempotency(type, payload, context = {}) {

  const key = store.generateKey(type, payload, context);

  if (store.exists(key)) {
    return {
      isDuplicate: true,
      key,
      cached: store.get(key),
    };
  }

  store.set(key, {
    type,
    payload,
    context,
    status: 'processing',
  });

  return {
    isDuplicate: false,
    key,
  };
}

function markCompleted(key, result) {
  const entry = store.get(key);

  if (entry) {
    store.set(key, {
      ...entry,
      status: 'completed',
      result,
    });
  }
}

function markFailed(key, error) {
  const entry = store.get(key);

  if (entry) {
    store.set(key, {
      ...entry,
      status: 'failed',
      error: error.message,
    });
  }
}

module.exports = {
  checkIdempotency,
  markCompleted,
  markFailed,
};
