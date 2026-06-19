const { validateAssistantResponse } = require('../../src/services/ai/assistantResponseSchema');
const { getAIProvider, getProviderMetadata } = require('../../src/services/ai/providers');
const openaiProvider = require('../../src/services/ai/providers/openaiProvider');
const mockProvider = require('../../src/services/ai/providers/mockProvider');
const { withProviderTimeout } = require('../../src/services/ai/providerTimeout');
const { checkProviderBudget } = require('../../src/services/ai/providerBudgetGuard');

describe('AI provider adapter foundation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  it('chooses mock provider by default', () => {
    delete process.env.AI_PROVIDER;
    delete process.env.AI_PROVIDER_ENABLED;

    expect(getAIProvider()).toBe(mockProvider);
    expect(getProviderMetadata()).toMatchObject({
      provider: 'mock',
      enabled: false,
      model: 'mock',
      ready: true,
    });
  });

  it('reports controlled readiness metadata for enabled OpenAI without key', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_PROVIDER_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    expect(getAIProvider()).toBe(openaiProvider);
    expect(getProviderMetadata()).toMatchObject({
      provider: 'openai',
      enabled: true,
      ready: false,
      errorCode: 'AI_PROVIDER_MISSING_KEY',
    });
  });

  it('mock provider returns schema-compatible assistant response', async () => {
    const response = await mockProvider.generateAssistantResponse({
      intent: 'review',
      prompt: 'Summarize status',
      requestId: 'req-provider-test',
      registryEntry: { description: 'Review accounting status' },
      context: {
        invoices: [],
        expenses: [],
        bankTransactions: [],
        insights: [],
      },
    });

    expect(validateAssistantResponse(response).success).toBe(true);
    expect(response.summary).toMatch(/review accounting status/i);
    expect(response.dataGaps.length).toBeGreaterThan(0);
  });

  it('provider timeout wrapper rejects with controlled timeout', async () => {
    await expect(
      withProviderTimeout(new Promise(() => {}), 1, { provider: 'mock' }),
    ).rejects.toMatchObject({
      errorCode: 'AI_PROVIDER_TIMEOUT',
      status: 504,
      metadata: { provider: 'mock' },
    });
  });

  it('budget guard returns allow metadata', () => {
    const result = checkProviderBudget({
      estimatedCostCents: 1,
      spentTodayCents: 2,
      config: {
        provider: 'mock',
        enabled: false,
        dailyBudgetCents: 500,
      },
    });

    expect(result).toMatchObject({
      allowed: true,
      reason: 'within_budget',
      metadata: {
        provider: 'mock',
        enabled: false,
        dailyBudgetCents: 500,
        spentTodayCents: 2,
        estimatedCostCents: 1,
        projectedSpendCents: 3,
      },
    });
  });
});
