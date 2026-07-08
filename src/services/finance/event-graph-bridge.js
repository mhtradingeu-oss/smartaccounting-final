const crypto = require('crypto');
const AuditLogService = require('../audit/AuditLogService');

/**
 * EVENT GRAPH BRIDGE (READ-ONLY SAFE LAYER)
 * Does NOT modify accounting logic
 */

const emitEvent = async (event) => {
  await AuditLogService.appendEntry({
    action: event.type,
    resourceType: event.entityType || 'EventGraph',
    resourceId: event.entityId || 'n/a',
    userId: event.userId,
    companyId: event.companyId,
    reason: 'event_graph',
    newValues: event,
  });

  return event;
};

const createEvent = (type, payload = {}) => {
  return {
    eventId: crypto.randomUUID(),
    type,
    payload,
    correlationId: payload.correlationId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  emitEvent,
  createEvent,
  buildEvent: createEvent,
};
