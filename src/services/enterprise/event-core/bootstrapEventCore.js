const { bus, emitUnified } = require('./unifiedEventBus');
const { persistEvent } = require('./eventPersistence');

/**
 * BOOTSTRAP EVENT BACKBONE
 */
function startEventCore() {

  bus.on('event', async (event) => {
    await persistEvent(event);
  });

  console.log('🧠 Unified Event Backbone ACTIVE');
}

module.exports = {
  startEventCore,
  emitUnified,
};
