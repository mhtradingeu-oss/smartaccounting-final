'use strict';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const METRICS_ENABLED = process.env.METRICS_ENABLED === 'true';
const LOG_SLOW_REQUEST_MS = Number(process.env.LOG_SLOW_REQUEST_MS || 1000);
const SNAPSHOT_INTERVAL_MS = Number(process.env.METRICS_SNAPSHOT_INTERVAL_MS || 60000);

const logger = require('../lib/logger');

// ----------------------------
// No-op implementations
// ----------------------------
function recordMetricsNoop() {}

// ----------------------------
// Snapshot state (production)
// ----------------------------
const snapshotState = {
  requests: 0,
  errors: 0,
  totalLatency: 0,
  slowRequests: 0,
  statusCounts: {},
};

function getStatusBucket(statusCode) {
  const prefix = Math.floor(statusCode / 100);
  return `${prefix}xx`;
}

function resetSnapshotState() {
  snapshotState.requests = 0;
  snapshotState.errors = 0;
  snapshotState.totalLatency = 0;
  snapshotState.slowRequests = 0;
  snapshotState.statusCounts = {};
}

function recordMetrics({ durationMs, statusCode }) {
  if (!METRICS_ENABLED) {
    return;
  }

  snapshotState.requests += 1;
  snapshotState.totalLatency += durationMs;

  if (statusCode >= 500) {
    snapshotState.errors += 1;
  }
  if (durationMs > LOG_SLOW_REQUEST_MS) {
    snapshotState.slowRequests += 1;
  }

  const bucket = getStatusBucket(statusCode);
  snapshotState.statusCounts[bucket] = (snapshotState.statusCounts[bucket] || 0) + 1;
}

function emitSnapshot() {
  if (!METRICS_ENABLED || snapshotState.requests === 0) {
    return;
  }

  const averageLatency = snapshotState.totalLatency / snapshotState.requests;
  const errorRate = (snapshotState.errors / snapshotState.requests) * 100;

  logger.performance('Runtime metrics snapshot', {
    requestCount: snapshotState.requests,
    averageLatencyMs: Number(averageLatency.toFixed(2)),
    errorRate: Number(errorRate.toFixed(2)),
    slowRequestCount: snapshotState.slowRequests,
    statusCounts: snapshotState.statusCounts,
    intervalMs: SNAPSHOT_INTERVAL_MS,
    timestamp: new Date().toISOString(),
  });

  resetSnapshotState();
}

// ----------------------------
// Background timer (prod only)
// ----------------------------
if (METRICS_ENABLED && !isTestEnvironment) {
  const timer = setInterval(emitSnapshot, SNAPSHOT_INTERVAL_MS);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

// ----------------------------
// Conditional export ONLY
// ----------------------------
module.exports = isTestEnvironment
  ? {
      METRICS_ENABLED: false,
      LOG_SLOW_REQUEST_MS: 0,
      recordMetrics: recordMetricsNoop,
    }
  : {
      METRICS_ENABLED,
      LOG_SLOW_REQUEST_MS,
      recordMetrics,
    };
