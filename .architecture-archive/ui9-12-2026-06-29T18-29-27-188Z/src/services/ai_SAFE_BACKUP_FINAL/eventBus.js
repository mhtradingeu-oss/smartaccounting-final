const { EventEmitter } = require('events');

const bus = new EventEmitter();

async function executeAIEvent(eventName, handler, context = {}) {
  if (typeof handler !== 'function') {
    return {};
  }

  const event = {
    eventName,
    requestId: context.requestId || 'unknown',
    companyId: context.companyId ?? null,
    promptKey: context.promptKey || null,
    purpose: context.purpose || null,
  };

  bus.emit('ai:requested', event);

  try {
    const data = await handler(context);
    bus.emit('ai:succeeded', event);
    return data;
  } catch (error) {
    bus.emit('ai:failed', {
      ...event,
      errorCode: error?.code || error?.errorCode || 'AI_HANDLER_ERROR',
    });
    throw error;
  }
}

module.exports = {
  bus,
  executeAIEvent,
};
