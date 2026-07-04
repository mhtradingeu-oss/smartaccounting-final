const AI_VOICE_ASSISTANT_ENDPOINT = '/api/ai/voice/assistant';

const DEFAULT_AI_HEADERS = {
  'x-ai-purpose': 'assistant_general',
  'x-ai-policy-version': '10.0.0',
};

const normalizeVoicePayload = (input, options = {}) => {
  if (typeof input === 'string') {
    return {
      transcript: input,
      intent: options.intent || 'review',
      responseMode: options.responseMode || 'text',
      sessionId: options.sessionId,
    };
  }

  if (input && typeof input === 'object' && !(input instanceof Blob)) {
    return {
      transcript: input.transcript || input.prompt || '',
      intent: input.intent || options.intent || 'review',
      responseMode: input.responseMode || options.responseMode || 'text',
      sessionId: input.sessionId || options.sessionId,
      targetInsightId: input.targetInsightId || options.targetInsightId,
    };
  }

  return {
    transcript: '',
    intent: options.intent || 'review',
    responseMode: options.responseMode || 'text',
    sessionId: options.sessionId,
  };
};

export async function processVoice(input, options = {}) {
  const payload = normalizeVoicePayload(input, options);

  if (!payload.transcript) {
    throw new Error(
      'Voice transcription is not available in the browser voice service yet. Pass a transcript to processVoice before calling the AI voice assistant.',
    );
  }

  const res = await fetch(AI_VOICE_ASSISTANT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...DEFAULT_AI_HEADERS,
      ...(options.headers || {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data?.message || data?.error || 'AI voice assistant request failed');
    error.status = res.status;
    error.response = data;
    throw error;
  }

  return data;
}

export { AI_VOICE_ASSISTANT_ENDPOINT };
