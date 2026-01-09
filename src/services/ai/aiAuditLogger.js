// AI Audit Logger: logs AI requests and responses (no PII)
const AuditLogService = require('../auditLogService');

const crypto = require('crypto');
const { redactPII } = require('./governance');

function sanitizePrompt(prompt) {
  const normalized = typeof prompt === 'string' ? prompt : '';
  return redactPII(normalized);
}

function hashPrompt(prompt) {
  const sanitized = sanitizePrompt(prompt);
  return sanitized ? crypto.createHash('sha256').update(sanitized).digest('hex') : undefined;
}

function sanitizeMeta(meta) {
  if (!meta) {
    return undefined;
  }
  return {
    policyVersion: meta.policyVersion,
    modelVersion: meta.modelVersion,
    promptVersion: meta.promptVersion,
    ruleId: meta.ruleId,
  };
}

async function logRequested({
  userId,
  companyId,
  requestId,
  queryType,
  route,
  prompt,
  responseMeta,
  sessionId,
  meta,
}) {
  await AuditLogService.appendEntry({
    action: 'AI_QUERY_REQUESTED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    oldValues: null,
    newValues: {
      requestId: requestId || 'unknown',
      route,
      queryType,
      promptHash: hashPrompt(prompt),
      sessionId,
      responseMeta,
      meta: sanitizeMeta(meta),
    },
    companyId,
    ipAddress: null,
    userAgent: null,
    reason: 'AI query requested',
    status: 'SUCCESS',
  });
}

async function logResponded({
  userId,
  companyId,
  requestId,
  queryType,
  route,
  prompt,
  responseMeta,
  sessionId,
  meta,
}) {
  const safeRequestId = requestId || 'unknown';
  await AuditLogService.appendEntry({
    action: 'AI_QUERY_RESPONDED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    oldValues: null,
    newValues: {
      requestId: safeRequestId,
      route,
      queryType,
      promptHash: hashPrompt(prompt),
      sessionId,
      responseMeta,
      meta: sanitizeMeta(meta),
    },
    companyId,
    ipAddress: null,
    userAgent: null,
    reason: 'AI query responded',
    status: 'SUCCESS',
  });
}

// eslint-disable-next-line no-unused-vars -- consumed via aiReadOnly session endpoint logging
// eslint-disable-next-line no-unused-vars -- consumed via aiReadOnly session endpoint logging
async function logSessionEvent({
  userId,
  companyId,
  _requestId,
  sessionId,
  event = 'started',
  route,
  prompt,
}) {
  const safePrompt = sanitizePrompt(prompt);
  await AuditLogService.appendEntry({
    action: 'AI_ASSISTANT_SESSION',
    resourceType: 'AI',
    resourceId: sessionId,
    userId,
    oldValues: null,
    newValues: {
      event,
      sessionId,
      route,
      prompt: safePrompt,
      promptHash: hashPrompt(prompt),
    },
    companyId,
    ipAddress: null,
    userAgent: null,
    reason: event,
    status: 'SUCCESS',
  });
}

/**
 * Logs an AI suggestion event (requested, rejected)
 * @param {Object} params
 */
async function logSuggestionEvent(params) {
  const {
    eventType, // 'AI_SUGGESTION_REQUESTED' | 'AI_SUGGESTION_REJECTED'
    userId,
    companyId,
    requestId,
    prompt,
    suggestion,
    reason,
    detector,
    severity,
    relatedEntityId,
    queryType,
    summary,
  } = params;
  const safeRequestId = requestId || 'unknown';
  await AuditLogService.appendEntry({
    action: eventType,
    resourceType: 'AI_SUGGESTION',
    resourceId: relatedEntityId || null,
    userId,
    oldValues: null,
    newValues: {
      requestId: safeRequestId,
      route: '/api/ai/suggest',
      promptHash: prompt ? hashPrompt(prompt) : undefined,
      suggestion: suggestion ? JSON.stringify(suggestion) : undefined,
      reason,
      detector,
      severity,
      queryType,
      summary,
    },
    companyId,
    ipAddress: null,
    userAgent: null,
    reason: reason || eventType,
    status: eventType === 'AI_SUGGESTION_REJECTED' ? 'DENIED' : 'SUCCESS',
  });
}

async function logRejected({ userId, companyId, requestId, queryType, route, prompt, reason }) {
  const safeRequestId = requestId || 'unknown';
  await AuditLogService.appendEntry({
    action: 'AI_QUERY_REJECTED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    oldValues: null,
    newValues: {
      requestId: safeRequestId,
      route,
      queryType,
      promptHash: hashPrompt(prompt),
      reason,
    },
    companyId,
    ipAddress: null,
    userAgent: null,
    reason: reason || 'AI query rejected',
    status: 'DENIED',
  });
}

async function logRateLimited({ userId, companyId, requestId, route, queryType, prompt }) {
  const safeRequestId = requestId || 'unknown';
  await AuditLogService.appendEntry({
    action: 'AI_RATE_LIMITED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    oldValues: null,
    newValues: {
      requestId: safeRequestId,
      route,
      queryType,
      promptHash: hashPrompt(prompt),
    },
    companyId,
    ipAddress: null,
    userAgent: null,
    reason: 'AI rate limited',
    status: 'DENIED',
  });
}

module.exports = { logRequested, logResponded, logRejected, logRateLimited, logSuggestionEvent };
