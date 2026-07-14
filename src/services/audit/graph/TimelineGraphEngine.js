const {
  getUnifiedTimeline,
} = require('../../enterprise/unified-read-model/unifiedTimelineService');

/**
 * NODE TYPES:
 * approval, ledger, execution, audit
 */

async function buildGraph(companyId) {
  const timelineResult = await getUnifiedTimeline(null, companyId);

  const rawEvents = (timelineResult.timeline || []).map((event) => ({
    type: event.type,
    entityType: event.entityType,
    entityId: event.entityId,
    companyId: event.companyId,
    timestamp: event.timestamp,
    payload: event.payload,
    correlationId: event.correlationId,
  }));

  const nodes = [];
  const edges = [];

  const nodeMap = new Map();

  for (const e of rawEvents) {
    const nodeId = `${e.entityType}:${e.entityId}`;

    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        id: nodeId,
        type: e.entityType,
        entityId: e.entityId,
        companyId: e.companyId,
        events: [],
      });

      nodes.push(nodeMap.get(nodeId));
    }

    nodeMap.get(nodeId).events.push(e);
  }

  const sorted = rawEvents.sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );

  for (let i = 1; i < sorted.length; i++) {
    const from = sorted[i - 1];
    const to = sorted[i];

    edges.push({
      from: `${from.entityType}:${from.entityId}`,
      to: `${to.entityType}:${to.entityId}`,
      action: to.type,
    });
  }

  return {
    nodes,
    edges,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      events: rawEvents.length,
    },
  };
}

/**
 * Trace full chain for one entity
 */
async function traceEntity(entityType, entityId, companyId) {
  const graph = await buildGraph(companyId);

  return (
    graph.nodes.find(
      (n) => n.id === `${entityType}:${entityId}`,
    ) || null
  );
}

module.exports = {
  buildGraph,
  traceEntity,
};
