const {
  getProviderConfig,
  isProviderEnabled,
  assertProviderReady,
} = require('../../src/services/ai/providers/providerConfig');

describe('AI provider config', () => {
  it('defaults to mock and disabled', () => {
    const config = getProviderConfig({});

    expect(config).toMatchObject({
      provider: 'mock',
      enabled: false,
      openaiApiKey: '',
      openaiModel: 'gpt-4o-mini',
      timeoutMs: 8000,
      maxOutputTokens: 900,
      dailyBudgetCents: 500,
    });
    expect(isProviderEnabled({})).toBe(false);
  });

  it('does not require OPENAI_API_KEY when provider is disabled', () => {
    const config = getProviderConfig({
      AI_PROVIDER: 'openai',
      AI_PROVIDER_ENABLED: 'false',
    });

    expect(config.provider).toBe('openai');
    expect(config.enabled).toBe(false);
    expect(() => assertProviderReady(config)).not.toThrow();
  });

  it('returns a controlled readiness error when OpenAI is enabled without a key', () => {
    const config = getProviderConfig({
      AI_PROVIDER: 'openai',
      AI_PROVIDER_ENABLED: 'true',
    });

    expect(() => assertProviderReady(config)).toThrow('OPENAI_API_KEY');
    try {
      assertProviderReady(config);
    } catch (error) {
      expect(error.status).toBe(503);
      expect(error.errorCode).toBe('AI_PROVIDER_MISSING_KEY');
      expect(error.message).not.toMatch(/sk-/);
    }
  });
});
