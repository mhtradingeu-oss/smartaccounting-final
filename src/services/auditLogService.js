const { AuditLog, sequelize, User } = require('../models');
const crypto = require('crypto');
const { assertSystemContext } = require('./systemContext');
const stableStringify = require('json-stable-stringify');

/**
 * GoBD-compliant Audit Logging Service
 * - Append-only, hash-chained, write-only
 * - No update/delete allowed
 * - Failure to log = operation rejected
 */
class AuditLogService {
  /**
   * Write a new audit log entry (append-only, hash-chained)
   * @param {Object} params - { action, resourceType, resourceId, userId, oldValues, newValues, ipAddress, userAgent }
   * @throws Error if log cannot be written
   */
  static async appendEntry({
    action,
    resourceType,
    resourceId,
    userId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
    reason,
    transaction: providedTransaction,
    context,
  } = {}) {
    // If context is provided, validate it and merge into metadata
    let metadata = {};
    if (context) {
      assertSystemContext(context);
      metadata = { ...context };
    } else {
      // TODO: Migrate all callers to provide SystemContext for full GoBD compliance
      // Optionally log a warning here
    }
    if (!userId) {
      const err = new Error('Audit log entry must include actor userId');
      err.status = 400;
      throw err;
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      const err = new Error('Audit log entry reason is required');
      err.status = 400;
      throw err;
    }
    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();
    const transaction = providedTransaction || (await sequelize.transaction());
    const ownsTransaction = !providedTransaction;
    try {
      const findOptions = {
        order: [['createdAt', 'DESC']],
        attributes: ['hash'],
        transaction,
      };
      const dialect =
        typeof sequelize.getDialect === 'function'
          ? sequelize.getDialect()
          : sequelize.options?.dialect;
      if (dialect !== 'sqlite') {
        findOptions.lock = transaction.LOCK.UPDATE;
      }
      const lastLog = await AuditLog.findOne(findOptions);
      const previousHash = lastLog ? lastLog.hash : null;
      // companyId logic: prefer context, fallback to user lookup for backward compatibility
      let companyId = context?.companyId;
      if (companyId === null || companyId === undefined) {
        if (userId) {
          const userRecord = await User.findByPk(userId, {
            attributes: ['companyId'],
            transaction,
          });
          companyId = userRecord?.companyId;
        }
      }
      // ACCOUNTING events must have companyId
      if (context?.eventClass === 'ACCOUNTING' && (companyId === null || companyId === undefined)) {
        throw new Error('ACCOUNTING events must have companyId (SystemContext enforced)');
      }
      // Exclude createdAt/updatedAt from hash input, use stable serialization
      const hashInput = stableStringify({
        action,
        resourceType,
        resourceId,
        userId,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
        timestamp: isoTimestamp,
        previousHash,
        reason,
        companyId,
        metadata,
      });
      const createdLog = await AuditLog.create(
        {
          action,
          resourceType,
          resourceId,
          userId,
          oldValues,
          newValues,
          metadata,
          ipAddress,
          userAgent,
          timestamp,
          hash: crypto.createHash('sha256').update(hashInput).digest('hex'),
          previousHash,
          reason,
          immutable: true,
          companyId,
        },
        { transaction, allowTestAuditLog: true },
      );
      if (ownsTransaction) {
        await transaction.commit();
      }
      return createdLog;
    } catch (err) {
      if (ownsTransaction) {
        await transaction.rollback();
      }
      throw new Error('Audit log write failed: ' + err.message);
    }
  }

  /**
   * Export audit logs (JSON or CSV)
   */
  static async exportLogs({ format = 'json', from, to, companyId } = {}) {
    const where = {};
    const Op = sequelize.Sequelize.Op;
    if (from || to) {
      where.timestamp = {};
      if (from) {
        const parsedFrom = new Date(from);
        if (!Number.isNaN(parsedFrom.getTime())) {
          where.timestamp[Op.gte] = parsedFrom;
        }
      }
      if (to) {
        const parsedTo = new Date(to);
        if (!Number.isNaN(parsedTo.getTime())) {
          where.timestamp[Op.lte] = parsedTo;
        }
      }
      if (Object.keys(where.timestamp).length === 0) {
        delete where.timestamp;
      }
    }
    const include = [];
    if (companyId) {
      include.push({
        model: User,
        as: 'user',
        attributes: [],
        required: true,
        where: { companyId },
      });
    }

    const logs = await AuditLog.findAll({
      where,
      include,
      order: [['timestamp', 'ASC']],
      attributes: [
        'id',
        'action',
        'resourceType',
        'resourceId',
        'oldValues',
        'newValues',
        'ipAddress',
        'userAgent',
        'timestamp',
        'userId',
        'hash',
        'previousHash',
        'reason',
      ],
    });
    if (format === 'csv') {
      // Simple CSV export
      const rows = logs.map((l) => {
        const log = l.get({ plain: true });
        const timestamp = log.timestamp ? new Date(log.timestamp).toISOString() : '';
        return [
          log.id,
          log.action,
          log.resourceType,
          log.resourceId,
          log.userId,
          timestamp,
          log.hash,
          log.previousHash,
          log.reason,
        ]
          .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
          .join(',');
      });
      const header = 'id,action,resourceType,resourceId,userId,timestamp,hash,previousHash,reason';
      return header + '\n' + rows.join('\n');
    }
    return logs.map((log) => log.get({ plain: true }));
  }

  /**
   * Validate hash chain integrity
   */
  static async validateChain() {
    const logs = await AuditLog.findAll({ order: [['timestamp', 'ASC']] });
    let prevHash = null;
    for (const log of logs) {
      const timestampIso =
        log.timestamp && log.timestamp.toISOString ? log.timestamp.toISOString() : log.timestamp;
      // Exclude createdAt/updatedAt from hash input, use stable serialization
      const hashInput = stableStringify({
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        userId: log.userId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: timestampIso,
        previousHash: log.previousHash,
        reason: log.reason,
        companyId: log.companyId,
        metadata: log.metadata,
      });
      const expectedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
      if (log.hash !== expectedHash || log.previousHash !== prevHash) {
        return false;
      }
      prevHash = log.hash;
    }
    return true;
  }
}

module.exports = AuditLogService;
