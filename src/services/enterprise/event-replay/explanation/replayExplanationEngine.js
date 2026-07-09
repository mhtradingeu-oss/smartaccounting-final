const { replayTimeline } = require('../eventReplayEngine');

function topEntries(record = {}, limit = 8) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function getDominantActivity(stepSummary = {}) {
  const categories = stepSummary.byCategory || {};
  const top = topEntries(categories, 3);

  if (!top.length) {
    return {
      label: 'No activity detected',
      details: [],
    };
  }

  return {
    label: top[0].name,
    details: top,
  };
}

function explainHealth(health = {}) {
  if (health.status === 'empty') {
    return {
      level: 'info',
      title: 'No replayable activity found',
      message: 'The selected scope does not contain timeline events that can be replayed.',
    };
  }

  if (health.status === 'blocked') {
    return {
      level: 'error',
      title: 'Replay is blocked',
      message: 'The replay contains blocking warnings and should not be used for operational decisions until reviewed.',
    };
  }

  if (health.status === 'needs_review') {
    return {
      level: 'warning',
      title: 'Replay needs review',
      message: 'The replay completed successfully, but duplicate events or review-level warnings were detected.',
    };
  }

  return {
    level: 'success',
    title: 'Replay is ready',
    message: 'The replay completed successfully and no blocking issues were detected.',
  };
}

function explainWarnings(warningSummary = {}) {
  const byCode = warningSummary.byCode || {};
  const explanations = [];

  if (byCode.EVENT_WITHOUT_COMPANY_ID) {
    explanations.push({
      code: 'EVENT_WITHOUT_COMPANY_ID',
      severity: 'info',
      count: byCode.EVENT_WITHOUT_COMPANY_ID,
      meaning: 'Some historical audit events are not linked to a companyId.',
      impact: 'This can reduce tenant-level filtering accuracy for older events, but it does not mean the replay engine failed.',
      recommendation: 'Keep the replay read-only. Later, add a companyId backfill or enforce companyId in future audit writes.',
    });
  }

  if (byCode.EVENT_WITHOUT_TIMESTAMP) {
    explanations.push({
      code: 'EVENT_WITHOUT_TIMESTAMP',
      severity: 'warning',
      count: byCode.EVENT_WITHOUT_TIMESTAMP,
      meaning: 'Some events have no timestamp.',
      impact: 'Ordering can be unreliable for those events.',
      recommendation: 'Review the source of these events before using replay order for audit decisions.',
    });
  }

  if (byCode.POTENTIAL_DUPLICATE_EVENTS) {
    explanations.push({
      code: 'POTENTIAL_DUPLICATE_EVENTS',
      severity: 'warning',
      count: byCode.POTENTIAL_DUPLICATE_EVENTS,
      meaning: 'The replay detected possible duplicate event keys.',
      impact: 'Some actions may have been recorded more than once or seeded repeatedly.',
      recommendation: 'Review duplicate samples before using replay output for final compliance reporting.',
    });
  }

  for (const [code, count] of Object.entries(byCode)) {
    if (explanations.some((item) => item.code === code)) {continue;}

    explanations.push({
      code,
      severity: 'info',
      count,
      meaning: 'A replay warning was detected.',
      impact: 'Impact depends on the event source and category.',
      recommendation: 'Review warning samples in the replay summary.',
    });
  }

  return explanations;
}

function explainSources(sourceTimeline = {}) {
  const sources = sourceTimeline.sources || {};
  const result = [];

  if (sources.auditLogs > 0) {
    result.push({
      source: 'auditLogs',
      count: sources.auditLogs,
      meaning: 'Historical audit log activity was included in the replay.',
    });
  }

  if (sources.ledger > 0) {
    result.push({
      source: 'ledger',
      count: sources.ledger,
      meaning: 'Ledger-related rows were included as observed read-only state.',
    });
  }

  if (sources.approvals > 0) {
    result.push({
      source: 'approvals',
      count: sources.approvals,
      meaning: 'Approval queue items were included as observed approval state.',
    });
  }

  if (sources.eventStore > 0) {
    result.push({
      source: 'eventStore',
      count: sources.eventStore,
      meaning: 'Durable event-store records were included.',
    });
  } else {
    result.push({
      source: 'eventStore',
      count: 0,
      meaning: 'No durable EventStore model records were available in this replay.',
    });
  }

  return result;
}

function buildNarrative(replayResult = {}) {
  const replay = replayResult.replay || {};
  const stepSummary = replay.stepSummary || {};
  const warningSummary = replay.warningSummary || {};
  const health = replay.health || {};
  const dominant = getDominantActivity(stepSummary);
  const topTypes = topEntries(stepSummary.byType || {}, 8);
  const topSources = topEntries(stepSummary.bySource || {}, 5);

  const paragraphs = [];

  if (!replay.stepsCount) {
    paragraphs.push('No replayable activity was found for this scope.');
  } else {
    paragraphs.push(
      `The replay scanned ${replay.stepsCount} normalized timeline events in read-only simulation mode.`,
    );

    paragraphs.push(
      `The dominant activity category is "${dominant.label}". The most active sources are ${topSources
        .map((item) => `${item.name} (${item.count})`)
        .join(', ')}.`,
    );

    if (topTypes.length) {
      paragraphs.push(
        `The most frequent event types are ${topTypes
          .slice(0, 5)
          .map((item) => `${item.name} (${item.count})`)
          .join(', ')}.`,
      );
    }

    if (warningSummary.total > 0) {
      paragraphs.push(
        `The replay detected ${warningSummary.total} warnings. Most of them are data-quality warnings from historical records, not write failures.`,
      );
    }

    if (health.status === 'needs_review') {
      paragraphs.push(
        'The replay is safe to explain, but it should be reviewed before being used as a compliance-final or tenant-final reconstruction.',
      );
    }

    paragraphs.push(
      'No financial writes were performed. The replay engine observed existing timeline, ledger, audit, and approval data only.',
    );
  }

  return paragraphs;
}

function buildRecommendedActions(replayResult = {}) {
  const replay = replayResult.replay || {};
  const health = replay.health || {};
  const warningSummary = replay.warningSummary || {};
  const byCode = warningSummary.byCode || {};
  const actions = [];

  if (!replay.stepsCount) {
    actions.push({
      priority: 'medium',
      action: 'Select a real entityId or run the replay without an entity filter.',
      reason: 'The current scope returned no timeline events.',
    });
  }

  if (byCode.EVENT_WITHOUT_COMPANY_ID) {
    actions.push({
      priority: 'medium',
      action: 'Add companyId enforcement to future audit writes.',
      reason: 'Many historical audit events are not tenant-scoped.',
    });
  }

  if (byCode.POTENTIAL_DUPLICATE_EVENTS) {
    actions.push({
      priority: 'medium',
      action: 'Review duplicate event samples before final compliance use.',
      reason: 'Replay detected possible duplicate event keys.',
    });
  }

  if ((replayResult.sourceTimeline?.sources?.eventStore || 0) === 0) {
    actions.push({
      priority: 'low',
      action: 'Register and migrate durable EventStore later.',
      reason: 'Current replay works from audit, ledger, and approval sources, while EventStore DB source is still empty.',
    });
  }

  if (health.safeToExplain) {
    actions.push({
      priority: 'high',
      action: 'Use this explanation output in the AI/Observability UI.',
      reason: 'The replay is read-only and safe to explain.',
    });
  }

  actions.push({
    priority: 'high',
    action: 'Keep writes disabled in replay endpoints.',
    reason: 'Replay must remain simulation-only until governance and posting rules are approved.',
  });

  return actions;
}

function buildDecision(replayResult = {}) {
  const health = replayResult.replay?.health || {};

  return {
    canExplain: health.safeToExplain === true,
    canWrite: false,
    canUseForFinalCompliance: health.status === 'ready',
    requiresHumanReview: health.status !== 'ready',
    status: health.status || 'unknown',
  };
}

async function explainReplay(options = {}) {
  const replayResult = await replayTimeline(options);

  const explanation = {
    success: true,
    mode: 'explanation',
    readOnly: true,
    writesPerformed: false,
    entityId: replayResult.entityId,
    companyId: replayResult.companyId,
    decision: buildDecision(replayResult),
    summary: {
      title: 'AI Replay Explanation',
      health: explainHealth(replayResult.replay?.health),
      sourceTimeline: replayResult.sourceTimeline,
      stepSummary: replayResult.replay?.stepSummary,
      warningSummary: replayResult.replay?.warningSummary,
    },
    narrative: buildNarrative(replayResult),
    sourceExplanation: explainSources(replayResult.sourceTimeline),
    warningExplanation: explainWarnings(replayResult.replay?.warningSummary),
    recommendedActions: buildRecommendedActions(replayResult),
  };

  return explanation;
}

module.exports = {
  explainReplay,
  buildNarrative,
  explainWarnings,
  buildDecision,
};
