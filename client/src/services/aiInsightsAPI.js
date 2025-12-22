// aiInsightsAPI.js (real data, read-only, explainable)

import api from './api';

export const aiInsightsAPI = {
  async list() {
    const res = await api.get('/v1/ai/insights');
    return res.data?.insights ?? [];
  },
  async decide(insightId, decision, reason) {
    const res = await api.post(`/v1/ai/insights/${insightId}/decisions`, { decision, reason });
    return res.data;
  },
  async export(format = 'json') {
    const url = format === 'csv' ? '/v1/ai/exports/insights.csv' : '/v1/ai/exports/insights.json';
    const res = await api.get(url, { responseType: format === 'csv' ? 'blob' : 'json' });
    return res.data;
  },
};
