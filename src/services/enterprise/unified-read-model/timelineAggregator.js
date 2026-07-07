
let db;

function getDB() {
  if (!db) {
    db = require('../../../models');
  }

  return db;
}


let auditLogService;

function getAuditLogService() {
  if (!auditLogService) {
    auditLogService = require('../../auditLogService');
  }

  return auditLogService;
}


async function fetchEventStoreRows(entityId, companyId) {
  try {
    const database = getDB();
    if (!database.EventStore || typeof database.EventStore.findAll !== 'function') {
      return [];
    }

    const where = {};
    if (entityId) where.entityId = entityId;
    if (companyId) where.companyId = companyId;

    return await getDB().EventStore.findAll({
      where,
      order: [['createdAt', 'ASC']],
      limit: 500,
    });
  } catch (error) {
    return [];
  }
}

async function fetchAuditRows(entityId, companyId) {
  try {
    const AuditLogService = getAuditLogService();
    const logs = await AuditLogService.exportLogs({ companyId });
    const rows = Array.isArray(logs) ? logs : logs?.logs || logs?.entries || [];

    if (!entityId) return rows;

    return rows.filter((row) => {
      const plain = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
      return String(plain?.resourceId || plain?.entityId || '') === String(entityId);
    });
  } catch (error) {
    return [];
  }
}

async function fetchLedgerRows(entityId, companyId) {
  try {
    const database = getDB();

    const candidates = [
      database.JournalEntry,
      database.JournalEntryLine,
      database.Transaction,
    ].filter(Boolean);

    const out = [];

    for (const model of candidates) {
      if (typeof model.findAll !== 'function') continue;

      const where = {};
      if (companyId) where.companyId = companyId;

      const rows = await model.findAll({
        where,
        limit: 500,
        order: [['createdAt', 'ASC']],
      }).catch(() => []);

      for (const row of rows) {
        const plain = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
        if (!entityId || String(plain?.id || plain?.sourceId || plain?.resourceId || '') === String(entityId)) {
          out.push(plain);
        }
      }
    }

    return out;
  } catch (error) {
    return [];
  }
}

async function fetchApprovalRows(entityId, companyId) {
  try {
    const database = getDB();
    if (!database.AIApprovalQueueItem || typeof database.AIApprovalQueueItem.findAll !== 'function') {
      return [];
    }

    const where = {};
    if (companyId) where.companyId = companyId;
    if (entityId) where.approvalId = entityId;

    return await getDB().AIApprovalQueueItem.findAll({
      where,
      order: [['createdAt', 'ASC']],
      limit: 500,
    });
  } catch (error) {
    return [];
  }
}

async function fetchUnifiedTimeline(entityId, companyId) {
  const [events, audits, ledger, approvals] = await Promise.all([
    fetchEventStoreRows(entityId, companyId),
    fetchAuditRows(entityId, companyId),
    fetchLedgerRows(entityId, companyId),
    fetchApprovalRows(entityId, companyId),
  ]);

  return {
    events,
    audits,
    ledger,
    approvals,
  };
}

module.exports = {
  fetchUnifiedTimeline,
};
