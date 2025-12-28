// aiInsightsAPI.js (real data, read-only, explainable)

import api from './api';

export const aiInsightsAPI = {
  async list() {
    const res = await api.get('/ai/insights');
    const payload = res.data || {};
    return {
      insights: payload.insights ?? [],
      viewerLimited: Boolean(payload.viewerLimited),
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
