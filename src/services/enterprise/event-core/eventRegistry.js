/**
 * CENTRAL EVENT REGISTRY (ENTERPRISE CONTROL PLANE)
 */

const registry = {
  'approval.created': { domain: 'approval' },
  'approval.executed': { domain: 'approval' },

  'ledger.posted': { domain: 'ledger' },
  'ledger.reversed': { domain: 'ledger' },

  'execution.simulation.completed': { domain: 'execution' },
  'execution.started': { domain: 'execution' },
  'execution.completed': { domain: 'execution' },

  'ai.requested': { domain: 'ai' },
  'ai.succeeded': { domain: 'ai' },
  'ai.failed': { domain: 'ai' },
};

function getEventMeta(type) {
  return registry[type] || {
    domain: 'unknown',
  };
}

module.exports = {
  registry,
  getEventMeta,
};
