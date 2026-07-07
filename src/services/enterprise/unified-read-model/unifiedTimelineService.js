const { fetchUnifiedTimeline } = require('./timelineAggregator');
const { normalizeEvent } = require('./eventNormalizer');

async function getUnifiedTimeline(entityId, companyId) {
  const { events, audits, ledger, approvals } = await fetchUnifiedTimeline(entityId, companyId);

  const timeline = [
    ...(events || []).map((row) => normalizeEvent(row, 'event_store')),
    ...(audits || []).map((row) => normalizeEvent(row, 'audit_log')),
    ...(ledger || []).map((row) => normalizeEvent(row, 'ledger')),
    ...(approvals || []).map((row) => normalizeEvent(row, 'approval_queue')),
  ].filter((item) => item.timestamp || item.entityId || item.type);

  timeline.sort((a, b) => {
    const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return at - bt;
  });

  return {
    entityId: entityId || null,
    companyId: companyId || null,
    count: timeline.length,
    sources: {
      eventStore: events.length,
      auditLogs: audits.length,
      ledger: ledger.length,
      approvals: approvals.length,
    },
    replayReady: timeline.length > 0,
    timeline,
  };
}

module.exports = {
  getUnifiedTimeline,
};
