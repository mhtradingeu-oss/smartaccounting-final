
const db = require('../../../models');

/**
 * ENTERPRISE IDEMPOTENCY SERVICE
 * Prevents duplicate financial execution
 */

class IdempotencyService {

  static async check(key, scope) {
    const record = await db.Idempotency.findOne({
      where: { key, scope },
    });

    return record;
  }

  static async create(key, scope, requestHash) {
    return await db.Idempotency.create({
      key,
      scope,
      requestHash,
      status: 'processing',
    });
  }

  static async complete(key, scope, result) {
    return await db.Idempotency.update(
      {
        status: 'done',
        result,
      },
      {
        where: { key, scope },
      },
    );
  }

  static async fail(key, scope, error) {
    return await db.Idempotency.update(
      {
        status: 'failed',
        result: { error: error.message },
      },
      {
        where: { key, scope },
      },
    );
  }
}

module.exports = IdempotencyService;
