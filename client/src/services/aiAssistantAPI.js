import api from './api';
import { AI_ASSISTANT_PURPOSE, AI_POLICY_VERSION } from '../lib/aiConstants';

const ENDPOINT = '/ai/read';
const AI_HEADERS = {
  'x-ai-purpose': AI_ASSISTANT_PURPOSE,
  'x-ai-policy-version': AI_POLICY_VERSION,
};

const resolveCacheKey = (companyId) => (companyId ? String(companyId) : 'default');
const buildHeaders = (companyId) => ({
  ...AI_HEADERS,
  ...(companyId ? { 'X-Company-Id': companyId } : {}),
});

export const aiAssistantAPI = {
  sessionCache: {},
  contextCache: {},
  sessionInFlight: {},
  contextInFlight: {},
  async getContext({ companyId } = {}) {
    const cacheKey = resolveCacheKey(companyId);
    if (this.contextCache[cacheKey]) {
      return this.contextCache[cacheKey];
    }
    if (this.contextInFlight[cacheKey]) {
      return this.contextInFlight[cacheKey];
    }
    this.contextInFlight[cacheKey] = api
      .get(`${ENDPOINT}/assistant/context`, { headers: buildHeaders(companyId) })
      .then((response) => {
        const context = response.data?.context ?? null;
        if (context && Object.keys(context).length > 0) {
          this.contextCache[cacheKey] = context;
        }
        return context;
      })
      .finally(() => {
        this.contextInFlight[cacheKey] = null;
      });
    return this.contextInFlight[cacheKey];
  },
  async askIntent({ intent, prompt, targetInsightId, sessionId, companyId }) {
    const params = {
      intent,
      prompt,
      targetInsightId,
      sessionId,
    };
    const response = await api.get(`${ENDPOINT}/assistant`, {
      params,
      headers: buildHeaders(companyId),
    });
    return response.data;
  },
  async askVoice({ intent, transcript, sessionId, responseMode = 'text', companyId }) {
    const payload = {
      intent,
      transcript,
      sessionId,
      responseMode,
    };
    const response = await api.post('/ai/voice/assistant', payload, {
      headers: buildHeaders(companyId),
    });
    return response.data;
  },
  async startSession({ companyId } = {}) {
    const cacheKey = resolveCacheKey(companyId);
    if (this.sessionCache[cacheKey]) {
      return this.sessionCache[cacheKey];
    }
    if (this.sessionInFlight[cacheKey]) {
      return this.sessionInFlight[cacheKey];
    }
    this.sessionInFlight[cacheKey] = api
      .get(`${ENDPOINT}/session`, { headers: buildHeaders(companyId) })
      .then((response) => {
        const session = response.data;
        if (session?.sessionId) {
          this.sessionCache[cacheKey] = session;
        }
        return session;
      })
      .finally(() => {
        this.sessionInFlight[cacheKey] = null;
      });
    return this.sessionInFlight[cacheKey];
  },
  reset() {
    this.sessionCache = {};
    this.contextCache = {};
    this.sessionInFlight = {};
    this.contextInFlight = {};
  },
};

export default aiAssistantAPI;
