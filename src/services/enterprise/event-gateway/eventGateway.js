const { createEvent } = require('../event-core/eventContract');
const { emitUnified } = require('../event-core/unifiedEventBus');
const { getEventMeta } = require('../event-core/eventRegistry');

const { checkIdempotency, markCompleted, markFailed } =
require('../idempotency/idempotencyEngine');

/**
 * ENTERPRISE EVENT GATEWAY (CLEAN VERSION)
 */
async function eventGateway(type, payload = {}, context = {}) {

  // 1. IDEMPOTENCY CHECK
  const idempotency = checkIdempotency(type, payload, context);

  if (idempotency.isDuplicate) {
    return {
      success: true,
      deduped: true,
      cached: idempotency.cached,
    };
  }

  const key = idempotency.key;

  // 2. META ENRICHMENT
  const meta = getEventMeta(type);

  const enrichedContext = {
    ...context,
    eventId: context.eventId || require('crypto').randomUUID(),
    domain: meta.domain,
  };

  // 3. NORMALIZE EVENT
  const event = createEvent(type, payload, enrichedContext);

  // 4. ROUTING
  if (type.startsWith('ai.')) {event.route = 'ai';}
  else if (type.startsWith('ledger.')) {event.route = 'ledger';}
  else if (type.startsWith('approval.')) {event.route = 'approval';}
  else if (type.startsWith('audit.')) {event.route = 'audit';}
  else {event.route = 'system';}

  // 5. EMIT CORE
  let result;

  try {
    result = await emitUnified(
      event.type,
      event.payload,
      enrichedContext,
    );
  } catch (error) {
    markFailed(key, error);
    throw error;
  }

  // 6. MARK COMPLETE
  markCompleted(key, result);

  return {
    success: true,
    event: result,
  };
}

module.exports = {
  eventGateway,
};
