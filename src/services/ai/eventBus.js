const { EventEmitter } = require('events');

const bus = new EventEmitter();

/**
 * CORE EVENT BUS (FINANCE + AI + SYSTEM)
 * Single source of truth for .on/.emit
 */
async function executeAIEvent(eventName, handler, context = {}) {
  const event = {
    eventName,
    requestId: context.requestId || 'unknown',
    companyId: context.companyId ?? null,
    timestamp: new Date().toISOString(),
  };

  bus.emit('ai:requested', event);

  try {
    const data = await handler(context);

    bus.emit('ai:succeeded', event);

    return data;

  } catch (error) {

    bus.emit('ai:failed', {
      ...event,
      error: error.message,
    });

    throw error;
  }
}

module.exports = {
  bus,
  eventBus: bus,
  executeAIEvent,
};
