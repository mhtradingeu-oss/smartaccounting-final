const { eventBus } = require('../../ai/eventBus');
const AuditLogService = require('../../auditLogService');

const TimelineStore = new Map();

/**
 * Normalize all system events into timeline format
 */
function normalize(event) {
  return {
    id: event.eventId || event.id,
    type: event.type,
    entityType: event.entityType || 'UNKNOWN',
    entityId: event.entityId,
    companyId: event.companyId,
    timestamp: event.timestamp || new Date().toISOString(),
    payload: event.payload || {},
  };
}

/**
 * Store event in memory timeline
 */
function store(event) {
  const key = `${event.companyId || 'global'}:${event.entityId || 'global'}`;

  if (!TimelineStore.has(key)) {
    TimelineStore.set(key, []);
  }

  TimelineStore.get(key).push(event);
}

/**
 * Event Consumer Core
 */
function startEventConsumer() {
  console.log('🟢 Event Consumer started');

  eventBus.on('event', async (event) => {
    try {
      const normalized = normalize(event);

      store(normalized);

      // also keep compliance audit trace (safe mirror)
      await AuditLogService.appendEntry({
        action: 'event_consumed',
        resourceType: normalized.entityType,
        resourceId: normalized.entityId,
        companyId: normalized.companyId,
        reason: 'timeline_consumer',
        newValues: normalized,
      });

    } catch (err) {
      console.warn('Event consumer failed:', err.message);
    }
  });
}

/**
 * Get timeline for entity
 */
function getTimeline(entityId, companyId) {
  const key = `${companyId || 'global'}:${entityId}`;
  return TimelineStore.get(key) || [];
}

module.exports = {
  startEventConsumer,
  getTimeline,
};
