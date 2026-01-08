// SystemContext Validator for GoBD-safe audit logging

const VALID_ACTOR_TYPES = ['USER', 'SYSTEM', 'AI'];
const VALID_SCOPE_TYPES = ['COMPANY', 'GLOBAL'];
const VALID_EVENT_CLASSES = ['ACCOUNTING', 'SECURITY', 'OPS', 'AI_GOVERNANCE', 'NOTIFICATION'];
const VALID_STATUS = ['SUCCESS', 'DENIED'];

function assertSystemContext(ctx) {
  if (!ctx) {
    throw new Error('SystemContext is required');
  }

  // Required fields
  if (!ctx.reason || typeof ctx.reason !== 'string' || !ctx.reason.trim()) {
    throw new Error('SystemContext.reason is required');
  }
  if (!VALID_STATUS.includes(ctx.status)) {
    throw new Error(`SystemContext.status must be one of: ${VALID_STATUS.join(', ')}`);
  }
  if (!VALID_ACTOR_TYPES.includes(ctx.actorType)) {
    throw new Error(`SystemContext.actorType must be one of: ${VALID_ACTOR_TYPES.join(', ')}`);
  }
  if (!VALID_EVENT_CLASSES.includes(ctx.eventClass)) {
    throw new Error(`SystemContext.eventClass must be one of: ${VALID_EVENT_CLASSES.join(', ')}`);
  }
  if (!VALID_SCOPE_TYPES.includes(ctx.scopeType)) {
    throw new Error(`SystemContext.scopeType must be one of: ${VALID_SCOPE_TYPES.join(', ')}`);
  }

  // ACCOUNTING events must be COMPANY scoped and have companyId
  if (ctx.eventClass === 'ACCOUNTING') {
    if (ctx.scopeType !== 'COMPANY') {
      throw new Error('ACCOUNTING events must have scopeType=COMPANY');
    }
    if (ctx.companyId === null || ctx.companyId === undefined) {
      throw new Error('ACCOUNTING events must have companyId');
    }
  }

  // USER must have actorId and companyId
  if (ctx.actorType === 'USER') {
    if (ctx.actorId === null || ctx.actorId === undefined) {
      throw new Error('USER actorType must have actorId');
    }
    if (ctx.companyId === null || ctx.companyId === undefined) {
      throw new Error('USER actorType must have companyId');
    }
  }

  // Traceability fields must exist (string or null)
  ['requestId', 'ipAddress', 'userAgent'].forEach((key) => {
    if (!(key in ctx)) {
      throw new Error(`SystemContext.${key} must exist (string or null)`);
    }
  });

  // DENIED must have reason
  if (ctx.status === 'DENIED' && (!ctx.reason || !ctx.reason.trim())) {
    throw new Error('DENIED audit log must have a reason');
  }

  // All other rules are enforced above
  return true;
}

module.exports = { assertSystemContext };
