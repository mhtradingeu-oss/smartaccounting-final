const AuditLogService = require('../services/auditLogService');

// Wraps accounting event with audit logging
function resolveValue(value, result) {
  if (typeof value === 'function') {
    return value(result);
  }
  return value;
}

async function withAuditLog({ action, resourceType, resourceId, userId, oldValues, newValues, ipAddress, userAgent, reason }, operation) {
  const result = await operation();
  try {
    await AuditLogService.appendEntry({
      action,
      resourceType,
      resourceId: resolveValue(resourceId, result),
      userId,
      oldValues: resolveValue(oldValues, result),
      newValues: resolveValue(newValues, result),
      ipAddress,
      userAgent,
      reason: reason || action,
    });
  } catch (err) {
    throw new Error('Operation reverted: ' + err.message);
  }
  return result;
}

module.exports = { withAuditLog };
