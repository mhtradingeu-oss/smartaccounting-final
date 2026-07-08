const { eventGateway } = require('./eventGateway');

/**
 * GLOBAL ENTRY POINT
 */
function emitEvent(type, payload, context = {}) {
  return eventGateway(type, payload, context);
}

module.exports = {
  emitEvent,
  eventGateway,
};
