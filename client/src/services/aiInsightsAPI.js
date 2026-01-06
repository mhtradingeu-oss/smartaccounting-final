// aiInsightsAPI.js (real data, read-only, explainable)

import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

export const aiInsightsAPI = {
  async list() {
    const res = await api.get('/ai/insights');
    const payload = res.data || {};
    const insights = payload.insights ?? [];
    const viewerLimited = Boolean(payload.viewerLimited);

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
  async export(format = 'json') {
    const url = format === 'csv' ? '/ai/exports/insights.csv' : '/ai/exports/insights.json';
    const res = await api.get(url, { responseType: format === 'csv' ? 'blob' : 'json' });
    return res.data;
  },
};

export default aiInsightsAPI;
