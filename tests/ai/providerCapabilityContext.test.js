describe('AI provider capability context', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('passes assistant capability contract to enabled providers', async () => {
    const generateAssistantResponse = jest.fn().mockResolvedValue({
      summary: 'Provider response with capability context.',
      risks: [],
      requiredActions: ['Review source records before making accounting decisions.'],
      dataGaps: [],
      confidence: 'estimated-medium',
    });

    jest.doMock('../../src/services/ai/providers/providerConfig', () => ({
      getProviderConfig: () => ({
        provider: 'mock',
        enabled: true,
        dailyBudgetCents: 500,
        timeoutMs: 8000,
        maxOutputTokens: 900,
      }),
      isProviderEnabled: () => true,
    }));

    jest.doMock('../../src/services/ai/providers', () => ({
      getProviderMetadata: () => ({
        provider: 'mock',
        enabled: true,
      }),
      getAIProvider: () => ({
        name: 'mock',
        generateAssistantResponse,
      }),
    }));

    const assistantService = require('../../src/services/ai/aiAssistantService');

    await assistantService.answerIntentComplianceWithProvider({
      intent: 'review',
      prompt: 'Review accounting risks',
      requestId: 'capability-context-test',
      context: {
        company: { id: 1, name: 'Capability Test GmbH' },
        invoices: [
          {
            id: 1,
            invoiceNumber: 'INV-1',
            status: 'OVERDUE',
            amount: 119,
            total: 119,
            currency: 'EUR',
          },
        ],
        expenses: [{ id: 1, amount: 59.5, currency: 'EUR' }],
        bankTransactions: [{ id: 1, amount: 119, isReconciled: false }],
        insights: [
          {
            id: 1,
            severity: 'high',
            entityType: 'invoice',
            entityId: '1',
            type: 'invoice_anomaly',
            summary: 'High risk invoice',
            why: 'Evidence needs review',
            confidenceScore: 0.9,
            legalContext: 'GoBD',
            evidence: [],
            ruleId: 'test-rule',
          },
        ],
      },
    });

    expect(generateAssistantResponse).toHaveBeenCalledTimes(1);
    const providerInput = generateAssistantResponse.mock.calls[0][0];

    expect(providerInput.context).toHaveProperty('assistantCapabilities');
    expect(providerInput.context.assistantCapabilities).toMatchObject({
      mode: expect.objectContaining({
        mode: 'read_only_advisory',
      }),
      capabilities: expect.arrayContaining([
        expect.objectContaining({ id: 'invoices' }),
        expect.objectContaining({ id: 'vat' }),
        expect.objectContaining({ id: 'audit_readiness' }),
      ]),
    });
  });
});
