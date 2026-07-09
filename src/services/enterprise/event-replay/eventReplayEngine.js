const { getUnifiedTimeline } = require('../unified-read-model/unifiedTimelineService');

function safeString(value) {
  if (value === null || value === undefined) {return null;}
  return String(value);
}

function toBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function toPositiveInt(value, fallback = 50, max = 500) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {return fallback;}
  return Math.min(parsed, max);
}

function getEventKey(event) {
  return [
    event.source || 'unknown',
    event.type || 'unknown',
    event.entityType || 'entity',
    event.entityId || 'na',
    event.timestamp || 'no-time',
  ].join(':');
}

function createInitialState(entityId, companyId) {
  return {
    entityId: entityId || null,
    companyId: companyId || null,
    counters: {
      total: 0,
      bySource: {},
      byType: {},
      byCategory: {},
    },
    approvals: [],
    ledger: [],
    exports: [],
    ai: [],
    bank: [],
    documents: [],
    generic: [],
    warnings: [],
  };
}

function incrementCounter(target, key) {
  const normalizedKey = key || 'unknown';
  target[normalizedKey] = (target[normalizedKey] || 0) + 1;
}

function classifyEvent(event) {
  const type = safeString(event.type) || 'unknown';
  const source = safeString(event.source) || 'unknown';
  const payload = event.payload || {};

  if (source === 'approval_queue') {return 'approval';}
  if (source === 'ledger') {return 'ledger';}
  if (type.includes('EXPORT') || type.includes('DATEV')) {return 'export';}
  if (type.startsWith('AI_') || type.includes('AI_QUERY')) {return 'ai';}
  if (type.includes('bank_import') || type.includes('BankStatement')) {return 'bank';}

  if (
    type.includes('document') ||
    type.includes('ocr') ||
    event.entityType === 'FileAttachment' ||
    payload.documentId
  ) {
    return 'document';
  }

  return 'generic';
}

function addWarning(state, warning) {
  state.warnings.push({
    ...warning,
    severity: warning.severity || 'info',
  });
}

function applyEventToState(state, event, index) {
  const type = safeString(event.type) || 'unknown';
  const source = safeString(event.source) || 'unknown';
  const category = classifyEvent(event);

  state.counters.total += 1;
  incrementCounter(state.counters.bySource, source);
  incrementCounter(state.counters.byType, type);
  incrementCounter(state.counters.byCategory, category);

  if (!event.timestamp) {
    addWarning(state, {
      code: 'EVENT_WITHOUT_TIMESTAMP',
      index,
      type,
      source,
      severity: 'warning',
    });
  }

  if (!event.companyId) {
    addWarning(state, {
      code: 'EVENT_WITHOUT_COMPANY_ID',
      index,
      type,
      source,
      severity: 'info',
    });
  }

  const replayStep = {
    index,
    key: getEventKey(event),
    type,
    source,
    category,
    timestamp: event.timestamp || null,
    entityType: event.entityType || null,
    entityId: event.entityId || null,
    operation: 'observe',
    effect: null,
  };

  if (category === 'approval') {
    replayStep.effect = 'approval_state_observed';
    state.approvals.push(replayStep);
  } else if (category === 'ledger') {
    replayStep.effect = 'ledger_state_observed';
    state.ledger.push(replayStep);
  } else if (category === 'export') {
    replayStep.effect = 'export_activity_observed';
    state.exports.push(replayStep);
  } else if (category === 'ai') {
    replayStep.effect = 'ai_activity_observed';
    state.ai.push(replayStep);
  } else if (category === 'bank') {
    replayStep.effect = 'bank_activity_observed';
    state.bank.push(replayStep);
  } else if (category === 'document') {
    replayStep.effect = 'document_activity_observed';
    state.documents.push(replayStep);
  } else {
    replayStep.effect = 'generic_activity_observed';
    state.generic.push(replayStep);
  }

  return replayStep;
}

function summarizeWarnings(warnings = []) {
  const byCode = {};
  const bySeverity = {};
  const samples = {};

  for (const warning of warnings) {
    const code = warning.code || 'UNKNOWN_WARNING';
    const severity = warning.severity || 'info';

    byCode[code] = (byCode[code] || 0) + 1;
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;

    if (!samples[code]) {
      samples[code] = [];
    }

    if (samples[code].length < 5) {
      samples[code].push({
        index: warning.index,
        type: warning.type,
        source: warning.source,
        severity,
      });
    }
  }

  return {
    total: warnings.length,
    byCode,
    bySeverity,
    samples,
  };
}

function summarizeSteps(steps = []) {
  const byCategory = {};
  const bySource = {};
  const byType = {};

  for (const step of steps) {
    incrementCounter(byCategory, step.category);
    incrementCounter(bySource, step.source);
    incrementCounter(byType, step.type);
  }

  return {
    total: steps.length,
    byCategory,
    bySource,
    byType,
  };
}

function createReplayHealth({ steps, warnings, duplicateCount }) {
  const blockingWarnings = warnings.filter((warning) => warning.severity === 'error').length;
  const warningWarnings = warnings.filter((warning) => warning.severity === 'warning').length;

  let status = 'ready';

  if (!steps.length) {
    status = 'empty';
  } else if (blockingWarnings > 0) {
    status = 'blocked';
  } else if (warningWarnings > 0 || duplicateCount > 0) {
    status = 'needs_review';
  }

  return {
    status,
    blockingWarnings,
    reviewWarnings: warningWarnings,
    duplicateCount,
    safeToExplain: steps.length > 0,
    safeToWrite: false,
    reason: 'Replay engine is read-only and does not perform financial writes.',
  };
}

async function replayTimeline({
  entityId = null,
  companyId = null,
  includeSteps = false,
  includeWarnings = false,
  limit = 50,
} = {}) {
  const normalizedLimit = toPositiveInt(limit, 50, 500);

  const unified = await getUnifiedTimeline(entityId, companyId);
  const timeline = Array.isArray(unified.timeline) ? unified.timeline : [];

  const state = createInitialState(entityId, companyId);
  const steps = timeline.map((event, index) => applyEventToState(state, event, index));

  const duplicateKeys = [];
  const seen = new Set();

  for (const step of steps) {
    if (seen.has(step.key)) {
      duplicateKeys.push(step.key);
    } else {
      seen.add(step.key);
    }
  }

  if (duplicateKeys.length > 0) {
    addWarning(state, {
      code: 'POTENTIAL_DUPLICATE_EVENTS',
      count: duplicateKeys.length,
      sample: duplicateKeys.slice(0, 5),
      severity: 'warning',
    });
  }

  const warningSummary = summarizeWarnings(state.warnings);
  const stepSummary = summarizeSteps(steps);
  const replayHealth = createReplayHealth({
    steps,
    warnings: state.warnings,
    duplicateCount: duplicateKeys.length,
  });

  const compactState = {
    entityId: state.entityId,
    companyId: state.companyId,
    counters: state.counters,
    buckets: {
      approvals: state.approvals.length,
      ledger: state.ledger.length,
      exports: state.exports.length,
      ai: state.ai.length,
      bank: state.bank.length,
      documents: state.documents.length,
      generic: state.generic.length,
    },
  };

  const response = {
    success: true,
    mode: 'simulation',
    readOnly: true,
    writesPerformed: false,
    entityId: entityId || null,
    companyId: companyId || null,
    sourceTimeline: {
      count: unified.count || timeline.length,
      sources: unified.sources || {},
      replayReady: unified.replayReady === true,
    },
    replay: {
      replayReady: timeline.length > 0,
      health: replayHealth,
      stepsCount: steps.length,
      stepSummary,
      warningSummary,
      state: compactState,
      stepsSample: steps.slice(0, normalizedLimit),
    },
  };

  if (toBoolean(includeSteps)) {
    response.replay.steps = steps;
  }

  if (toBoolean(includeWarnings)) {
    response.replay.warnings = state.warnings;
  }

  return response;
}

module.exports = {
  replayTimeline,
  summarizeWarnings,
  summarizeSteps,
};
