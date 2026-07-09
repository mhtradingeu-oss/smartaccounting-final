const { buildGraph } = require('../../audit/graph/TimelineGraphEngine');

/**
 * AI REASONING ENGINE (RULE-BASED FIRST STAGE)
 * Later can be upgraded to LLM (GPT / Claude)
 */

/**
 * Explain WHY an entity action happened
 */
function explainEntity(entityType, entityId, companyId) {
  const graph = buildGraph(companyId);

  const nodeId = `${entityType}:${entityId}`;
  const node = graph.nodes.find(n => n.id === nodeId);

  if (!node) {
    return {
      success: false,
      reason: 'NO_ENTITY_FOUND',
    };
  }

  const events = node.events || [];

  const summary = {
    entity: nodeId,
    totalEvents: events.length,
    actions: [],
    reasoning: [],
  };

  for (const e of events) {
    summary.actions.push(e.type);

    // RULE-BASED REASONING ENGINE
    if (e.type === 'execution_simulation') {
      summary.reasoning.push(
        'System simulated execution before approval confirmation.',
      );
    }

    if (e.type === 'execution_posted') {
      summary.reasoning.push(
        'Financial entry was permanently posted to ledger after approval.',
      );
    }

    if (e.type === 'approval.viewed') {
      summary.reasoning.push(
        'User reviewed approval before decision flow continued.',
      );
    }
  }

  return {
    success: true,
    explanation: {
      entity: nodeId,
      totalEvents: summary.totalEvents,
      actions: summary.actions,
      reasoning: summary.reasoning,
    },
  };
}

/**
 * Explain full financial chain (approval → ledger → execution)
 */
function explainChain(companyId) {
  const graph = buildGraph(companyId);

  return {
    success: true,
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    insight: [
      'System is operating in event-sourced accounting mode.',
      'All financial operations are traceable through graph engine.',
      'Execution events are derived from approval lifecycle.',
    ],
    graphStats: graph.stats,
  };
}

module.exports = {
  explainEntity,
  explainChain,
};
