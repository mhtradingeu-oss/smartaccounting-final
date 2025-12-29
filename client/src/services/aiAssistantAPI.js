import api from './api';

const ENDPOINT = '/ai/read';

export const aiAssistantAPI = {
  async getContext() {
    const response = await api.get(`${ENDPOINT}/assistant/context`);
    return response.data?.context ?? null;
  },
  async askIntent({ intent, prompt, targetInsightId, sessionId }) {
    const params = {
      intent,
      prompt,
      targetInsightId,
      sessionId,
    };
    const response = await api.get(`${ENDPOINT}/assistant`, { params });
    return response.data;
  },
  async startSession() {
    const response = await api.get(`${ENDPOINT}/session`);
    return response.data;
  },
};

export default aiAssistantAPI;
