/**
 * UNIFIED EVENT CONTRACT (UEB CORE)
 */

function createEvent(type, payload = {}, context = {}) {
  return {
    eventId: context.eventId || require('crypto').randomUUID(),
    type,
    version: context.version || 1,

    timestamp: new Date().toISOString(),

    companyId: context.companyId || null,
    userId: context.userId || null,

    entity: {
      type: context.entityType || null,
      id: context.entityId || null,
    },

    trace: {
      correlationId: context.correlationId || require('crypto').randomUUID(),
      source: context.source || 'system',
    },

    payload,
  };
}

module.exports = {
  createEvent,
};
