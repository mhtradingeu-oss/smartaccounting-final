// aiInsightsAPI.js (real data, read-only, explainable)

import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';
import { AI_INSIGHTS_PURPOSE, AI_POLICY_VERSION } from '../lib/aiConstants';

const AI_HEADERS = {
  'x-ai-purpose': AI_INSIGHTS_PURPOSE,
  'x-ai-policy-version': AI_POLICY_VERSION,
};

const buildHeaders = (companyId) => ({
  ...AI_HEADERS,
  ...(companyId ? { 'X-Company-Id': companyId } : {}),
});

const resolveInsightsPayload = (payload) => {
  if (Array.isArray(payload?.insights)) {
    return payload.insights;
  }
  if (Array.isArray(payload?.data?.insights)) {
    return payload.data.insights;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

const normalizeInsight = (insight) => {
  if (!insight || typeof insight !== 'object') {
    return null;
  }
  const confidenceScore =
    typeof insight.confidenceScore === 'number'
      ? insight.confidenceScore
      : typeof insight.confidence === 'number'
        ? insight.confidence
        : null;
  return {
    id: insight.id,
    type: insight.type,
    severity: insight.severity || 'low',
    confidence: confidenceScore,
    confidenceScore,
    summary: insight.summary || '',
    explanation: insight.explanation || insight.rationale || insight.why || insight.summary || '',
    rationale: insight.rationale || insight.why || insight.summary || '',
    why: insight.why || insight.rationale || insight.explanation || insight.summary || '',
    relatedEntity: insight.relatedEntity || insight.entityType || 'record',
    entityId: insight.entityId,
    dataSource: insight.dataSource,
    timeframe: insight.timeframe || insight.lastEvaluated || insight.updatedAt || insight.createdAt,
    lastEvaluated:
      insight.lastEvaluated || insight.updatedAt || insight.createdAt || insight.timeframe,
    legalContext: insight.legalContext,
    ruleId: insight.ruleId,
    evidence: insight.evidence,
  };
};

export const aiInsightsAPI = {
  async list({ companyId } = {}) {
    const res = await api.get('/ai/insights', { headers: buildHeaders(companyId) });
    const payload = res.data || {};
    const insights = resolveInsightsPayload(payload).map(normalizeInsight).filter(Boolean);
    const viewerLimited = Boolean(payload.viewerLimited ?? payload.data?.viewerLimited);

    if (isDemoMode() && (!Array.isArray(insights) || insights.length === 0)) {
      return {
        insights: DEMO_DATA.aiInsights ?? [],
        viewerLimited: false,
      };
    }

    return {
      insights,
      viewerLimited,
    };
  },
  async decide(insightId, decision, reason) {
    const res = await api.post(`/ai/insights/${insightId}/decisions`, { decision, reason });
    return res.data;
  },
  async export(format = 'json', { companyId } = {}) {
    const url = format === 'csv' ? '/ai/exports/insights.csv' : '/ai/exports/insights.json';
    const res = await api.get(url, {
      responseType: format === 'csv' ? 'blob' : 'json',
      headers: buildHeaders(companyId),
    });
    return res.data;
  },
};

export default aiInsightsAPI;
