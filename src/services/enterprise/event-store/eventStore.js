/**
 * ENTERPRISE EVENT STORE LAYER (DB READY ABSTRACTION)
 * This will later connect to PostgreSQL / Event Sourcing DB
 */

class EventStore {
  constructor() {
    this.buffer = [];
  }

  /**
   * Append immutable event (enterprise-safe)
   */
  async append(event) {
    const enriched = {
      ...event,
      persistedAt: new Date().toISOString(),
      version: 1,
    };

    // TEMP: in-memory buffer (will be DB later)
    this.buffer.push(enriched);

    return enriched;
  }

  /**
   * Query by entity
   */
  async queryByEntity(entityType, entityId) {
    return this.buffer.filter(
      e => e.entityType === entityType && e.entityId === entityId,
    );
  }

  /**
   * Full audit replay (enterprise feature)
   */
  async replay() {
    return this.buffer;
  }
}

module.exports = new EventStore();
