const EventStore = require('../event-store/eventStore.service');

/**
 * PERSIST EVERY EVENT (SOURCE OF TRUTH)
 */
async function persistEvent(event) {
  try {
    await EventStore.create({
      eventType: event.type,
      entityType: event.entity.type,
      entityId: event.entity.id,
      companyId: event.companyId,
      userId: event.userId,
      payload: event.payload,
      metadata: {
        version: event.version,
        correlationId: event.trace.correlationId,
      },
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn('EVENT PERSIST FAILED:', err.message);
  }
}

module.exports = {
  persistEvent,
};
