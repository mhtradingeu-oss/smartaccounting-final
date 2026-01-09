// Centralized SystemContext builder for all tests
// Usage: const systemContext = buildSystemContext();

/**
 * Build a SystemContext for tests, always including reason, status, and companyId if user provided.
 * @param {Object} opts
 * @param {string} [opts.reason] - Reason for the action
 * @param {string} [opts.status] - Status (default: 'SUCCESS')
 * @param {Object} [opts.user] - User object (should have companyId)
 * @returns {Object}
 */
function buildSystemContext(opts = {}) {
  const ctx = {
    requestId: 'test-request-id',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    source: 'TEST',
    reason: opts.reason || 'Test: invoice payment',
    status: opts.status || 'SUCCESS',
  };
  if (opts.user && opts.user.companyId) {
    ctx.companyId = opts.user.companyId;
  }
  return ctx;
}

module.exports = buildSystemContext;
