const { Worker } = require('bullmq');
const Redis = require('ioredis');
const EventStore = require('../event-store/eventStore.service');

const connection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

/**
 * DISTRIBUTED EVENT CONSUMER
 */
const worker = new Worker(
  'event-stream',
  async job => {

    const { event } = job.data;

    // 1. Persist event
    await EventStore.create({
      eventType: event.type,
      entityType: event.entity?.type,
      entityId: event.entity?.id,
      companyId: event.companyId,
      userId: event.userId,
      payload: event.payload,
      metadata: {
        traceId: event.trace?.correlationId,
      },
    });

    // 2. Log processing
    console.log('📡 Stream processed:', event.type);

    return { success: true };
  },
  { connection },
);

module.exports = {
  worker,
};
