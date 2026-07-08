
const db = require('../../../models');

class EventStoreService {

  static async record(event) {
    return await db.EventStore.create({
      eventType: event.type,
      entityType: event.entityType,
      entityId: event.entityId,
      companyId: event.companyId,
      userId: event.actor?.userId,
      payload: event.payload || {},
      metadata: {
        mode: event.mode,
        correlationId: event.correlationId,
      },
    });
  }

  static async getEntityHistory(entityType, entityId, companyId) {
    return await db.EventStore.findAll({
      where: { entityType, entityId, companyId },
      order: [['createdAt', 'ASC']],
    });
  }

}

module.exports = EventStoreService;
