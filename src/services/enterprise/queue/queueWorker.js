

const RetryOrchestrator = require('../dlq/retryOrchestrator');


const { Worker } = require('bullmq');
const { connection } = require('./queueSystem');
const { executeApprovalItem } = require('../../finance/executionEngine.service');
const AuditLogService = require('../../audit/AuditLogService');

/**
 * ENTERPRISE WORKER
 */
const worker = new Worker(
  'approval-execution',
  async (job) => {
    const { approvalId, user, mode, unlock } = job.data;

    try {
      await AuditLogService.appendEntry({
        action: 'queue_job_started',
        resourceType: 'ApprovalQueue',
        resourceId: approvalId,
        userId: user.id,
        companyId: user.companyId,
        reason: 'async_execution_start',
      });

      const result = await executeApprovalItem({
        approvalId,
        user,
        mode,
        unlock,
      });

      await AuditLogService.appendEntry({
        action: 'queue_job_completed',
        resourceType: 'ApprovalQueue',
        resourceId: approvalId,
        userId: user.id,
        companyId: user.companyId,
        reason: 'async_execution_done',
      });

      return result;

    } catch (err) {
      await AuditLogService.appendEntry({
        action: 'queue_job_failed',
        resourceType: 'ApprovalQueue',
        resourceId: approvalId,
        userId: user.id,
        companyId: user.companyId,
        reason: err.message,
      });

      
    const decision = RetryOrchestrator.handleFailure(job, err);

    if (decision.retry) {
      throw err; // BullMQ will retry automatically
    }

    return { status: 'moved_to_dlq' };
  
    }
  },
  { connection },
);

module.exports = worker;
