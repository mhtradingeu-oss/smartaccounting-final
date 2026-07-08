const fs = require('fs');
const path = require('path');

/**
 * SIMPLE SAFE PERSISTENCE LAYER (FILE-BASED FIRST)
 * (DB upgrade can come later without breaking system)
 */

const DB_FILE = path.join(__dirname, 'timeline-store.json');

/**
 * Ensure file exists
 */
function init() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ events: [] }, null, 2));
  }
}

/**
 * Save event permanently
 */
function saveEvent(event) {
  init();

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  db.events.push({
    ...event,
    persistedAt: new Date().toISOString(),
  });

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/**
 * Load events by entity
 */
function getEvents(entityId, companyId) {
  init();

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  return db.events.filter(e => {
    const entityMatches = entityId === null || entityId === undefined || e.entityId === entityId;
    const companyMatches = companyId === null || companyId === undefined || e.companyId === companyId;

    return entityMatches && companyMatches;
  });
}

module.exports = {
  saveEvent,
  getEvents,
};
