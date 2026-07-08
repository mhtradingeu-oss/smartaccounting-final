
const eventStore = require('../../enterprise/event-store/eventStore');

const { saveEvent } = require('./persistence/TimelinePersistence');
const crypto = require('crypto');
const AuditLogService = require('../AuditLogService');

const createEvent = ({
  type,
  entityType,
  entityId,
  companyId,
  user,
  payload = {},
  mode = 'simulation',
  correlationId,
}) => {
  return {
    eventId: crypto.randomUUID(),
    type,
    entityType,
    entityId,
    companyId,
    actor: {
      userId: user?.id,
      role: user?.role,
    },
    payload,
    mode,
    correlationId: correlationId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
};

const appendTimelineEvent = async (event) => {
  // STEP 1: keep legacy audit log
  
  await AuditLogService.appendEntry({

  // ENTERPRISE EVENT STORE MIRROR
  // FIXED: removed invalid append call
  
    action: event.type,
    resourceType: event.entityType,
    resourceId: event.entityId,
    userId: event.actor.userId,
    companyId: event.companyId,
    reason: 'timeline_event',
    newValues: event,
  });

  // STEP 2: return normalized event
  
  // PERSIST EVENT (non-blocking)
  try {
    
  saveEvent(event);

  // ENTERPRISE MIRROR
  try {
    eventStore.append(event);
  } catch (e) {
    console.warn('Enterprise store failed:', e.message);
  }
  
  } catch (e) {
    console.warn('Timeline persistence failed:', e.message);
  }

  return event;
  
};

const buildApprovalTimeline = (item, user, mode) => {
  return [
    createEvent({
      type: 'approval.viewed',
      entityType: 'ApprovalQueue',
      entityId: item.approvalId,
      companyId: item.companyId,
      user,
      payload: { status: item.status },
      mode,
    }),
  ];
};

module.exports = {
  createEvent,
  appendTimelineEvent,
  buildApprovalTimeline,
};
