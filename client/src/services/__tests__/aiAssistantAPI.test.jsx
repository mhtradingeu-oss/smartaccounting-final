import { describe, it, beforeEach, expect, vi } from 'vitest';
import { aiAssistantAPI } from '../aiAssistantAPI';
import { AI_ASSISTANT_PURPOSE, AI_POLICY_VERSION } from '../../lib/aiConstants';
import api from '../api';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
  },
}));

describe('aiAssistantAPI', () => {
  beforeEach(() => {
    aiAssistantAPI.reset();
    vi.clearAllMocks();
  });

  it('caches context/session and reuses in-flight requests', async () => {
    api.get.mockResolvedValueOnce({ data: { context: { company: 'Acme' } } });
    const firstContext = await aiAssistantAPI.getContext();
    const secondContext = await aiAssistantAPI.getContext();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(secondContext).toBe(firstContext);

    api.get.mockResolvedValueOnce({ data: { sessionId: 'sess-123' } });
    const firstSession = await aiAssistantAPI.startSession();
    const secondSession = await aiAssistantAPI.startSession();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(secondSession).toBe(firstSession);
  });

  it('sends ai meta headers for every request', async () => {
    api.get.mockResolvedValueOnce({ data: { context: {} } });
    await aiAssistantAPI.getContext();
    const [, contextConfig] = api.get.mock.calls[0];
    expect(contextConfig.headers).toMatchObject({
      'x-ai-purpose': AI_ASSISTANT_PURPOSE,
      'x-ai-policy-version': AI_POLICY_VERSION,
    });

    api.get.mockResolvedValueOnce({ data: { sessionId: 'abc' } });
    await aiAssistantAPI.startSession();
    const [, sessionConfig] = api.get.mock.calls[1];
    expect(sessionConfig.headers).toMatchObject({
      'x-ai-purpose': AI_ASSISTANT_PURPOSE,
      'x-ai-policy-version': AI_POLICY_VERSION,
    });

    api.get.mockResolvedValueOnce({ data: { answer: { message: 'ok' } } });
    await aiAssistantAPI.askIntent({
      intent: 'review',
      prompt: 'Test',
      sessionId: 'abc',
    });
    const [, askConfig] = api.get.mock.calls[2];
    expect(askConfig.headers).toMatchObject({
      'x-ai-purpose': AI_ASSISTANT_PURPOSE,
      'x-ai-policy-version': AI_POLICY_VERSION,
    });
    expect(askConfig.params).toMatchObject({
      intent: 'review',
      prompt: 'Test',
      sessionId: 'abc',
    });
  });
});
