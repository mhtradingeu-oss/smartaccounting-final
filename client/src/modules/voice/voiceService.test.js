import { describe, expect, it, vi, afterEach } from 'vitest';
import { AI_VOICE_ASSISTANT_ENDPOINT, processVoice } from './voiceService';

describe('voiceService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the official AI voice assistant endpoint with required safety headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: { message: 'Review current accounting status.' },
        responseMode: 'text',
      }),
    });

    const result = await processVoice('Summarize accounting status', {
      intent: 'review',
      sessionId: 'voice-test-session',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      AI_VOICE_ASSISTANT_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-ai-purpose': 'assistant_general',
          'x-ai-policy-version': '10.0.0',
        }),
      }),
    );

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual(
      expect.objectContaining({
        transcript: 'Summarize accounting status',
        intent: 'review',
        responseMode: 'text',
        sessionId: 'voice-test-session',
      }),
    );
    expect(result.answer.message).toBe('Review current accounting status.');
  });

  it('accepts object payloads and preserves target insight context', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ answer: { message: 'Insight reviewed.' } }),
    });

    await processVoice({
      transcript: 'Explain this insight',
      intent: 'explain_insight',
      responseMode: 'voice',
      sessionId: 'voice-object-session',
      targetInsightId: 42,
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual(
      expect.objectContaining({
        transcript: 'Explain this insight',
        intent: 'explain_insight',
        responseMode: 'voice',
        sessionId: 'voice-object-session',
        targetInsightId: 42,
      }),
    );
  });

  it('rejects raw audio blobs until transcription is explicitly implemented', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(processVoice(new Blob(['audio'], { type: 'audio/webm' }))).rejects.toThrow(
      /Voice transcription is not available/i,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws a useful error for failed voice assistant requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'AI Voice is disabled' }),
    });

    await expect(processVoice('Summarize status')).rejects.toMatchObject({
      message: 'AI Voice is disabled',
      status: 403,
    });
  });
});
