const { EventEmitter } = require('events');
const { createEvent } = require('./eventContract');

const bus = new EventEmitter();

/**
 * UNIFIED EVENT EMISSION LAYER
 */
async function emitUnified(type, payload = {}, context = {}) {
  const event = createEvent(type, payload, context);

  // 1. realtime emit
  bus.emit('event', event);

  // 2. categorized streams
  bus.emit(type, event);

  // 3. domain streams
  if (type.startsWith('ai.')) {bus.emit('ai', event);}
  if (type.startsWith('ledger.')) {bus.emit('ledger', event);}
  if (type.startsWith('approval.')) {bus.emit('approval', event);}
  if (type.startsWith('audit.')) {bus.emit('audit', event);}

  return event;
}

module.exports = {
  bus,
  emitUnified,
};
