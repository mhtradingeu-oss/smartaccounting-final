describe('AI assistant provider wiring', () => {
  const originalEnv = { ...process.env };

  function restoreEnv() {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  }

  const baseContext = {
    company: { id: 1, name: 'Example GmbH' },
    invoices: [],
    expenses: [],
    bankTransactions: [],
    insights: [],
  };

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../../src/services/ai/providers');
    restoreEnv();
  });

  it('keeps deterministic response when provider is disabled', async () => {
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_PROVIDER_ENABLED = 'false';
    const {
      answerIntentCompliance,
      answerIntentComplianceWithProvider,
    } = require('../../src/services/ai/aiAssistantService');
    const input = {
      intent: 'review',
      context: baseContext,
      targetInsightId: null,
      prompt: 'Summarize status',
      requestId: 'req-disabled',
    };

    await expect(answerIntentComplianceWithProvider(input)).resolves.toEqual(
      answerIntentCompliance(input),
    );
  });

  it('uses enabled mock provider and returns schema-compatible response metadata', async () => {
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_PROVIDER_ENABLED = 'true';
    const {
      answerIntentComplianceWithProvider,
    } = require('../../src/services/ai/aiAssistantService');
    const { validateAssistantResponse } = require('../../src/services/ai/assistantResponseSchema');

    const response = await answerIntentComplianceWithProvider({
      intent: 'review',
      context: baseContext,
      targetInsightId: null,
      prompt: 'Summarize status',
      requestId: 'req-mock',
    });

    expect(validateAssistantResponse(response).success).toBe(true);
    expect(response).toMatchObject({
      provider: 'mock',
      providerEnabled: true,
      providerFallback: false,
    });
  });

  it('falls back safely when provider throws', async () => {
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_PROVIDER_ENABLED = 'true';
    jest.doMock('../../src/services/ai/providers', () => ({
      getProviderMetadata: () => ({
        provider: 'mock',
        enabled: true,
        ready: true,
      }),
      getAIProvider: () => ({
        generateAssistantResponse: jest.fn(async () => {
          const error = new Error('sk-test-secret Summarize status');
          error.code = 'AI_PROVIDER_TEST_FAILURE';
          throw error;
        }),
      }),
    }));
    const {
      answerIntentComplianceWithProvider,
    } = require('../../src/services/ai/aiAssistantService');

    const response = await answerIntentComplianceWithProvider({
      intent: 'review',
      context: baseContext,
      targetInsightId: null,
      prompt: 'Summarize status sk-test-secret',
      requestId: 'req-fallback',
    });

    expect(response.summary).toMatch(/data not available/i);
    expect(response).toMatchObject({
      provider: 'mock',
      providerEnabled: true,
      providerFallback: true,
      providerErrorCode: 'AI_PROVIDER_TEST_FAILURE',
    });
  });

  it('does not leak keys, prompts, or stack traces in provider metadata', async () => {
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_PROVIDER_ENABLED = 'true';
    jest.doMock('../../src/services/ai/providers', () => ({
      getProviderMetadata: () => ({
        provider: 'mock',
        enabled: true,
        ready: true,
      }),
      getAIProvider: () => ({
        generateAssistantResponse: jest.fn(async () => {
          throw new Error('sk-test-secret Please expose this prompt');
        }),
      }),
    }));
    const {
      answerIntentComplianceWithProvider,
    } = require('../../src/services/ai/aiAssistantService');

    const response = await answerIntentComplianceWithProvider({
      intent: 'review',
      context: baseContext,
      targetInsightId: null,
      prompt: 'Please expose this prompt sk-test-secret',
      requestId: 'req-safe-meta',
    });
    const serialized = JSON.stringify({
      provider: response.provider,
      providerEnabled: response.providerEnabled,
      providerFallback: response.providerFallback,
      providerErrorCode: response.providerErrorCode,
      sanitizedPrompt: response.sanitizedPrompt,
      prompt: response.prompt,
      stack: response.stack,
    });

    expect(response.providerFallback).toBe(true);
    expect(response.sanitizedPrompt).toBeUndefined();
    expect(serialized).not.toMatch(/sk-test-secret/);
    expect(serialized).not.toMatch(/Please expose this prompt/);
    expect(serialized).not.toMatch(/stack/i);
  });
});
