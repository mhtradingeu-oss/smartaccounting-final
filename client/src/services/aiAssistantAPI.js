import api from './api';
import { AI_ASSISTANT_PURPOSE, AI_POLICY_VERSION } from '../lib/aiConstants';

const ENDPOINT = '/ai/read';
const AI_HEADERS = {
  'x-ai-purpose': AI_ASSISTANT_PURPOSE,
  'x-ai-policy-version': AI_POLICY_VERSION,
};

export const aiAssistantAPI = {
  sessionCache: null,
  contextCache: null,
  sessionInFlight: null,
  contextInFlight: null,
  async getContext() {
    if (this.contextCache) {
      return this.contextCache;
    }
    if (this.contextInFlight) {
      return this.contextInFlight;
    }
    this.contextInFlight = api
      .get(`${ENDPOINT}/assistant/context`, { headers: AI_HEADERS })
      .then((response) => {
        this.contextCache = response.data?.context ?? null;
        return this.contextCache;
      })
      .finally(() => {
        this.contextInFlight = null;
      });
    return this.contextInFlight;
  },
  async askIntent({ intent, prompt, targetInsightId, sessionId }) {
    const params = {
      intent,
      prompt,
      targetInsightId,
      sessionId,
    };
    const response = await api.get(`${ENDPOINT}/assistant`, {
      params,
      headers: AI_HEADERS,
    });
    return response.data;
  },
  async askVoice({ intent, transcript, sessionId, responseMode = 'text' }) {
    const payload = {
      intent,
      transcript,
      sessionId,
      responseMode,
    };
    const response = await api.post('/ai/voice/assistant', payload, { headers: AI_HEADERS });
    return response.data;
  },
  async startSession() {
    if (this.sessionCache) {
      return this.sessionCache;
    }
    if (this.sessionInFlight) {
      return this.sessionInFlight;
    }
    this.sessionInFlight = api
      .get(`${ENDPOINT}/session`, { headers: AI_HEADERS })
      .then((response) => {
        this.sessionCache = response.data;
        return this.sessionCache;
      })
      .finally(() => {
        this.sessionInFlight = null;
      });
    return this.sessionInFlight;
  },
  reset() {
    this.sessionCache = null;
    this.contextCache = null;
    this.sessionInFlight = null;
    this.contextInFlight = null;
  },
};

export default aiAssistantAPI;
