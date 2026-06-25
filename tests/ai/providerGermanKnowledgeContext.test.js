describe('AI provider German accounting knowledge context', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('passes German accounting knowledge contract to enabled providers', async () => {
    const generateAssistantResponse = jest.fn().mockResolvedValue({
      summary: 'Provider response with German accounting knowledge context.',
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
      prompt: 'Review German VAT and accounting readiness',
      requestId: 'german-knowledge-context-test',
      context: {
        company: { id: 1, name: 'Knowledge Test GmbH' },
        invoices: [{ id: 1, invoiceNumber: 'INV-1', status: 'SENT', total: 119, currency: 'EUR' }],
        expenses: [{ id: 1, grossAmount: 59.5, vatAmount: 9.5, currency: 'EUR' }],
        bankTransactions: [{ id: 1, amount: 119, currency: 'EUR', isReconciled: false }],
        insights: [{
          id: 1,
          severity: 'high',
          entityType: 'expense',
          entityId: '1',
          type: 'vat_risk',
          summary: 'VAT evidence requires review',
          why: 'Input VAT needs source document review',
          confidenceScore: 0.9,
          legalContext: 'UStG §14, §15',
          evidence: [],
          ruleId: 'vat-risk-test',
        }],
      },
    });

    expect(generateAssistantResponse).toHaveBeenCalledTimes(1);
    const providerInput = generateAssistantResponse.mock.calls[0][0];

    expect(providerInput.context).toHaveProperty('germanAccountingKnowledge');
    expect(providerInput.context.germanAccountingKnowledge).toMatchObject({
      scope: expect.objectContaining({
        jurisdiction: 'Germany',
        mode: 'evidence_based_advisory',
      }),
      knowledgeAreas: expect.arrayContaining([
        expect.objectContaining({ id: 'gobd' }),
        expect.objectContaining({ id: 'ustg_vat' }),
        expect.objectContaining({ id: 'datev' }),
        expect.objectContaining({ id: 'hgb_bookkeeping' }),
        expect.objectContaining({ id: 'posting_truth' }),
        expect.objectContaining({ id: 'daily_operations' }),
      ]),
    });

    expect(providerInput.context.germanAccountingKnowledge.scope.bindingAdvicePolicy).toContain('Steuerberater');
    expect(providerInput.context.germanAccountingKnowledge.scope.sourceOfTruthPolicy).toContain('posted journal entries');
  });
});
