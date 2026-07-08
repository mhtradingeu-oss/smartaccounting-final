const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection (Docker-safe fallback)
const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

/**
 * ENTERPRISE QUEUE
 */
const approvalQueue = new Queue('approval-execution', {
  connection,
});

/**
 * ADD JOB TO QUEUE
 */
async function enqueueApprovalExecution(data) {
  return await approvalQueue.add('execute-approval', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  });
}

module.exports = {
  approvalQueue,
  enqueueApprovalExecution,
  connection,
};
