
const crypto = require('crypto');

/**
 * ENTERPRISE TRACE CONTEXT
 * Tracks full lifecycle of financial operations
 */

class TraceContext {

  static create() {
    return {
      traceId: crypto.randomUUID(),
      startedAt: Date.now(),
    };
  }

  static attach(event, trace) {
    return {
      ...event,
      traceId: trace.traceId,
      duration: Date.now() - trace.startedAt,
    };
  }
}

module.exports = TraceContext;
