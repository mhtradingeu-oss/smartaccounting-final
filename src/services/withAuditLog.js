const AuditLogService = require('../services/auditLogService');

// Wraps accounting event with audit logging
async function withAuditLog({ action, resourceType, resourceId, userId, oldValues, newValues, ipAddress, userAgent, reason }, operation) {
  // Run operation, then log
  const result = await operation();
  try {
    await AuditLogService.appendEntry({
      action,
      resourceType,
      resourceId,
      userId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      reason: reason || action,
    });
  } catch (err) {
    // If audit log fails, revert
    throw new Error('Operation reverted: ' + err.message);
  }
  return result;
}

module.exports = { withAuditLog };
