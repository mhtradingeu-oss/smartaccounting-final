
const DeadLetterQueue = require('./deadLetterQueue');

/**
 * ENTERPRISE RETRY ORCHESTRATOR
 * Controls financial job retry behavior
 */

class RetryOrchestrator {

  static MAX_RETRIES = 3;

  static shouldRetry(job, error) {

    const isRetryable =
      error.message.includes('timeout') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('temporary');

    if (!isRetryable) {
      return false;
    }

    return job.attemptsMade < this.MAX_RETRIES;
  }

  static handleFailure(job, error) {

    if (this.shouldRetry(job, error)) {
      console.warn('🔁 RETRYING JOB:', job.id);
      return { retry: true };
    }

    // send to DLQ
    DeadLetterQueue.add(job, error);

    return { retry: false, dlq: true };
  }
}

module.exports = RetryOrchestrator;
