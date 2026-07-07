function toPlain(item) {
  if (!item) return {};
  if (typeof item.get === 'function') return item.get({ plain: true });
  if (typeof item.toJSON === 'function') return item.toJSON();
  return item;
}

function normalizeEvent(item, source) {
  const plain = toPlain(item);

  return {
    type: plain.type || plain.action || plain.eventType || plain.resourceType || 'unknown',
    entityType: plain.entityType || plain.resourceType || plain.sourceType || null,
    entityId: plain.entityId || plain.resourceId || plain.id || null,
    companyId: plain.companyId || null,
    userId: plain.userId || plain.createdBy || plain.decidedByUserId || null,
    timestamp: plain.createdAt || plain.timestamp || plain.updatedAt || null,
    source,
    payload: plain.payload || plain.newValues || plain.metadata || plain,
  };
}

module.exports = {
  normalizeEvent,
};
