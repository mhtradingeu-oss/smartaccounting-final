import { describe, it, beforeEach, expect, vi } from 'vitest';
import { aiAssistantAPI } from '../aiAssistantAPI';
import { AI_ASSISTANT_PURPOSE, AI_POLICY_VERSION } from '../../lib/aiConstants';
import api from '../api';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('aiAssistantAPI', () => {
  beforeEach(() => {
    aiAssistantAPI.reset();
    vi.clearAllMocks();
  });

  it('caches context/session and reuses in-flight requests', async () => {
    api.get.mockResolvedValueOnce({ data: { context: { company: 'Acme' } } });
    const firstContext = await aiAssistantAPI.getContext({ companyId: 10 });
    const secondContext = await aiAssistantAPI.getContext({ companyId: 10 });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(secondContext).toBe(firstContext);

    api.get.mockResolvedValueOnce({ data: { sessionId: 'sess-123' } });
    const firstSession = await aiAssistantAPI.startSession({ companyId: 10 });
    const secondSession = await aiAssistantAPI.startSession({ companyId: 10 });
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(secondSession).toBe(firstSession);

    api.get.mockResolvedValueOnce({ data: { context: { company: 'Beta' } } });
    const otherContext = await aiAssistantAPI.getContext({ companyId: 22 });
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(otherContext).not.toBe(firstContext);
  });

  it('sends ai meta headers for every request', async () => {
    api.get.mockResolvedValueOnce({ data: { context: {} } });
    await aiAssistantAPI.getContext({ companyId: 42 });
    const [, contextConfig] = api.get.mock.calls[0];
    expect(contextConfig.headers).toMatchObject({
      'x-ai-purpose': AI_ASSISTANT_PURPOSE,
      'x-ai-policy-version': AI_POLICY_VERSION,
      'X-Company-Id': 42,
    });

    api.get.mockResolvedValueOnce({ data: { sessionId: 'abc' } });
    await aiAssistantAPI.startSession({ companyId: 42 });
    const [, sessionConfig] = api.get.mock.calls[1];
    expect(sessionConfig.headers).toMatchObject({
      'x-ai-purpose': AI_ASSISTANT_PURPOSE,
      'x-ai-policy-version': AI_POLICY_VERSION,
      'X-Company-Id': 42,
    });

    api.post.mockResolvedValueOnce({ data: { answer: { message: 'ok' } } });
    await aiAssistantAPI.askIntent({
      intent: 'review',
      prompt: 'Test',
      sessionId: 'abc',
      companyId: 42,
    });
    const [, payload, askConfig] = api.post.mock.calls[0];
    expect(askConfig.headers).toMatchObject({
      'x-ai-purpose': AI_ASSISTANT_PURPOSE,
      'x-ai-policy-version': AI_POLICY_VERSION,
      'X-Company-Id': 42,
    });
    expect(payload).toMatchObject({
      intent: 'review',
      prompt: 'Test',
      sessionId: 'abc',
    });
  });
});
