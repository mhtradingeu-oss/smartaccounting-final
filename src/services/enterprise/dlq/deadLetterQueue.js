
/**
 * ENTERPRISE DEAD LETTER QUEUE (DLQ)
 * Stores permanently failed financial jobs
 */

const dlqStore = []; // can be replaced with DB later

class DeadLetterQueue {

  static add(job, error) {
    const entry = {
      id: job.id || null,
      queue: job.queueName || 'unknown',
      data: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade || 0,
    };

    dlqStore.push(entry);

    console.error('💀 DLQ ENTRY CREATED:', entry);

    return entry;
  }

  static getAll() {
    return dlqStore;
  }

  static clear() {
    dlqStore.length = 0;
  }
}

module.exports = DeadLetterQueue;
