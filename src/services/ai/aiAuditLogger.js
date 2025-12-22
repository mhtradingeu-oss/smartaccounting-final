// AI Audit Logger: logs AI requests and responses (no PII)
const { AuditLog } = require('../../models');

const crypto = require('crypto');

function hashPrompt(prompt) {
  return prompt ? crypto.createHash('sha256').update(prompt).digest('hex') : undefined;
}

async function logRequested({ userId, companyId, queryType, route, prompt, responseMeta }) {
  await AuditLog.create({
    action: 'AI_QUERY_REQUESTED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    companyId,
    metadata: {
      route,
      queryType,
      promptHash: hashPrompt(prompt),
      responseMeta,
    },
    createdAt: new Date().toISOString(),
    immutable: true,
    reason: 'AI query requested',
  });
}

async function logResponded({ userId, companyId, queryType, route, prompt, responseMeta }) {
  await AuditLog.create({
    action: 'AI_QUERY_RESPONDED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    companyId,
    metadata: {
      route,
      queryType,
      promptHash: hashPrompt(prompt),
      responseMeta,
    },
    createdAt: new Date().toISOString(),
    immutable: true,
    reason: 'AI query responded',
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
    prompt,
    suggestion,
    reason,
    createdAt,
    detector,
    severity,
    relatedEntityId,
    queryType,
    summary,
  } = params;
  await AuditLog.create({
    action: eventType,
    resourceType: 'AI_SUGGESTION',
    resourceId: relatedEntityId || null,
    userId,
    companyId,
    metadata: {
      route: '/api/ai/suggest',
      promptHash: prompt ? hashPrompt(prompt) : undefined,
      suggestion: suggestion ? JSON.stringify(suggestion) : undefined,
      reason,
      detector,
      severity,
      queryType,
      summary,
    },
    createdAt: createdAt || new Date(),
    reason: reason || eventType,
  });
}

async function logRejected({ userId, companyId, queryType, route, prompt, reason }) {
  await AuditLog.create({
    action: 'AI_QUERY_REJECTED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    companyId,
    metadata: {
      route,
      queryType,
      promptHash: hashPrompt(prompt),
      reason,
    },
    createdAt: new Date().toISOString(),
    immutable: true,
    reason: reason || 'AI query rejected',
  });
}

async function logRateLimited({ userId, companyId, route, queryType, prompt }) {
  await AuditLog.create({
    action: 'AI_RATE_LIMITED',
    resourceType: 'AI',
    resourceId: null,
    userId,
    companyId,
    metadata: {
      route,
      queryType,
      promptHash: hashPrompt(prompt),
    },
    createdAt: new Date().toISOString(),
    immutable: true,
    reason: 'AI rate limited',
  });
}

module.exports = { logRequested, logResponded, logRejected, logRateLimited, logSuggestionEvent };
