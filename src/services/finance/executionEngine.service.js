const IdempotencyService = require('../enterprise/idempotency/idempotency.service');

const TraceContext = require('../enterprise/observability/traceContext');
const ObservabilityLogger = require('../enterprise/observability/observabilityLogger');

// ===== ENTERPRISE QUEUE HOOK =====
const { enqueueApprovalExecution } = require('../enterprise/queue/queueSystem');

async function executeApprovalQueued(data) {
  return await enqueueApprovalExecution(data);
}
// ================================

// ===== EVENT GRAPH ACTIVATION LAYER (CLEAN) =====
// ===== EVENT GRAPH ACTIVATION LAYER (SAFE) =====

// wrapper helper (non-breaking)
/**
 * EVENT GRAPH BRIDGE (SAFE ADD-ON)
 * No change to ledger logic
 */

const AuditLogService = require('../audit/AuditLogService');
const LedgerService = require('./ledger.service');

/* ================= EVENT GRAPH (CLEAN CORE) ================ */
const { emitEvent, buildEvent } = require('./event-graph-bridge');

const emitFlowEvent = async (type, payload, user, companyId) => {
  try {
    return await emitEvent(
      buildEvent(type, {
        ...payload,
        userId: user?.id,
        companyId,
        correlationId: payload?.correlationId,
      }),
    );
  } catch (e) {
    console.warn('EventGraph failed:', e.message);
  }
};
/* ================= END EVENT GRAPH ================= */
const ApprovalQueue = require('../ai/aiApprovalQueueRepository');

const executeApprovalItem = async ({
  approvalId,
  user,
  mode = 'simulation',
  unlock = false,
  idempotencyKey,
}) => {
  // 🛡️ IDEMPOTENCY CHECK
  if (idempotencyKey) {
    const existing = await IdempotencyService.check(idempotencyKey, 'approval_execution');

    if (existing && existing.status === 'done') {
      return existing.result; // prevent duplicate execution
    }

    if (!existing) {
      await IdempotencyService.create(idempotencyKey, 'approval_execution', approvalId);
    }
  }

  const item = await ApprovalQueue.getById(approvalId);

  if (!item) {
    throw new Error('APPROVAL_NOT_FOUND');
  }

  if (item.status !== 'approved') {
    return { success: false, reason: 'NOT_APPROVED_YET' };
  }

  if (mode === 'simulation' || !unlock) {
    const preview = LedgerService.previewFromApproval(item);

    await AuditLogService.appendEntry({
      action: 'execution_simulation',
      resourceType: 'ApprovalQueue',
      resourceId: approvalId,
      userId: user.id,
      companyId: user.companyId,
      reason: 'Simulation mode',
      newValues: { preview },
    });

    return { success: true, mode: 'simulation', preview };
  }

  const ledgerEntry = await LedgerService.postFromApproval(item);

  await ApprovalQueue.markExecuted(approvalId, {
    executedBy: user.id,
    ledgerId: ledgerEntry.id,
  });

  await AuditLogService.appendEntry({
    action: 'execution_posted',
    resourceType: 'Ledger',
    resourceId: ledgerEntry.id,
    userId: user.id,
    companyId: user.companyId,
    reason: 'Real execution',
  });

  return { success: true, mode: 'execution', ledgerEntry };
};

module.exports = { executeApprovalItem };
