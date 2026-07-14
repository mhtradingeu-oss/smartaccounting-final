const { EventEmitter } = require('events');
const { createEvent } = require('./eventContract');

const bus = new EventEmitter();
let eventPersister = null;

function configureEventPersistence(persistEvent) {
  if (typeof persistEvent !== 'function') {
    throw new TypeError('Event persistence handler must be a function.');
  }

  eventPersister = persistEvent;
}

/**
 * UNIFIED EVENT EMISSION LAYER
 */
async function emitUnified(type, payload = {}, context = {}) {
  const event = createEvent(type, payload, context);

  // 1. durable persistence (when the event core is active)
  if (eventPersister) {
    await eventPersister(event);
  }

  // 2. realtime emit
  bus.emit('event', event);

  // 3. categorized streams
  bus.emit(type, event);

  // 4. domain streams
  if (type.startsWith('ai.')) {bus.emit('ai', event);}
  if (type.startsWith('ledger.')) {bus.emit('ledger', event);}
  if (type.startsWith('approval.')) {bus.emit('approval', event);}
  if (type.startsWith('audit.')) {bus.emit('audit', event);}

  return event;
}

module.exports = {
  bus,
  configureEventPersistence,
  emitUnified,
};
