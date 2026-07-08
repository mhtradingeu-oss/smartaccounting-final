
const AuditLogService = require('../../audit/AuditLogService');

/**
 * ENTERPRISE OBSERVABILITY LOGGER
 * Financial-grade transaction tracking
 */

class ObservabilityLogger {

  static async logStep({
    traceId,
    step,
    entityType,
    entityId,
    companyId,
    status,
    meta = {},
  }) {

    return await AuditLogService.appendEntry({
      action: `trace.${step}`,
      resourceType: entityType,
      resourceId: entityId,
      userId: meta.userId,
      companyId,
      reason: status,
      newValues: {
        traceId,
        step,
        meta,
      },
    });
  }

}

module.exports = ObservabilityLogger;
