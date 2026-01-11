import api, { API_BASE_URL } from './api';
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

const buildStreamHeaders = (companyId) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    ...buildHeaders(companyId),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
  };
};

const parseSseChunk = (chunk) => {
  const lines = chunk.split('\n');
  let event = 'message';
  let data = '';
  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.replace('event:', '').trim();
    } else if (line.startsWith('data:')) {
      data += line.replace('data:', '').trim();
    }
  });
  if (!data) {
    return null;
  }
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return { event, data };
  }
};

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
    const payload = {
      intent,
      prompt,
      targetInsightId,
      sessionId,
    };
    const response = await api.post(`${ENDPOINT}/assistant`, payload, {
      headers: buildHeaders(companyId),
    });
    return response.data;
  },
  async askIntentStream({
    intent,
    prompt,
    targetInsightId,
    sessionId,
    companyId,
    onEvent,
    signal,
  }) {
    const payload = {
      intent,
      prompt,
      targetInsightId,
      sessionId,
    };
    const response = await fetch(`${API_BASE_URL}${ENDPOINT}/assistant/stream`, {
      method: 'POST',
      headers: buildStreamHeaders(companyId),
      body: JSON.stringify(payload),
      credentials: 'include',
      signal,
    });
    if (!response.ok) {
      let errorPayload = {};
      try {
        errorPayload = await response.json();
      } catch {
        errorPayload = {};
      }
      const err = new Error(errorPayload.message || 'Unable to reach the assistant.');
      err.response = { status: response.status, data: errorPayload };
      throw err;
    }
    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new Error('Streaming not supported');
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf('\n\n');
      while (index !== -1) {
        const chunk = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const parsed = parseSseChunk(chunk);
        if (parsed && typeof onEvent === 'function') {
          onEvent(parsed);
        }
        index = buffer.indexOf('\n\n');
      }
    }
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
