const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

function runWithContext(context, callback) {
  asyncLocalStorage.run(context, callback);
}

function getRequestContext() {
  return asyncLocalStorage.getStore() || null;
}

function updateRequestContext(updates = {}) {
  const store = asyncLocalStorage.getStore();
  if (store) {
    Object.assign(store, updates);
  }
}

module.exports = {
  runWithContext,
  getRequestContext,
  updateRequestContext,
};
