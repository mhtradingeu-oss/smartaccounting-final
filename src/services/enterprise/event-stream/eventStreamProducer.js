const { Queue } = require('bullmq');
const Redis = require('ioredis');

/**
 * DISTRIBUTED EVENT STREAM PRODUCER
 * (Redis-backed durable queue)
 */

const connection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

const eventQueue = new Queue('event-stream', { connection });

async function publishEvent(event) {
  await eventQueue.add(
    event.type,
    {
      event,
      timestamp: Date.now(),
    },
    {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
    },
  );

  return true;
}

module.exports = {
  publishEvent,
  eventQueue,
  connection,
};
