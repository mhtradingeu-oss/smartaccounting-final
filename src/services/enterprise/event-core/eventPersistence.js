const EventStore = require('../event-store/eventStore.service');

/**
 * PERSIST EVERY EVENT (SOURCE OF TRUTH)
 */
async function persistEvent(event) {
  return EventStore.create({
    eventType: event.type,
    entityType: event.entity.type,
    entityId: event.entity.id,
    companyId: event.companyId,
    userId: event.userId,
    payload: event.payload,
    metadata: {
      version: event.version,
      correlationId: event.trace.correlationId,
      source: event.trace.source,
    },
    createdAt: new Date(event.timestamp),
  });
}

module.exports = {
  persistEvent,
};
