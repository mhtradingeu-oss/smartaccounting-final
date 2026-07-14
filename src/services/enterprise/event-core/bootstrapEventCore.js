const {
  configureEventPersistence,
  emitUnified,
} = require('./unifiedEventBus');
const { persistEvent } = require('./eventPersistence');

let started = false;

/**
 * BOOTSTRAP EVENT BACKBONE
 */
function startEventCore() {
  if (started) {
    return false;
  }

  configureEventPersistence(persistEvent);
  started = true;

  console.log('🧠 Unified Event Backbone ACTIVE');

  return true;
}

module.exports = {
  startEventCore,
  emitUnified,
};
