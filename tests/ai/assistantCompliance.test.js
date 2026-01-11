const { answerIntentCompliance } = require('../../src/services/ai/aiAssistantService');

describe('AI Assistant compliance wrapper', () => {
  it('reports data gaps instead of inventing values', () => {
    const context = {
      company: { id: 1, name: 'Example GmbH' },
      invoices: [],
      expenses: [],
      bankTransactions: [],
      insights: [],
    };

    const response = answerIntentCompliance({
      intent: 'review',
      context,
      targetInsightId: null,
      prompt: 'Summarize status',
    });

    expect(response.summary).toMatch(/data not available/i);
    expect(response.dataGaps.length).toBeGreaterThan(0);
  });

  it('does not force confidence to 0%', () => {
    const context = {
      company: { id: 1, name: 'Example GmbH' },
      invoices: [],
      expenses: [],
      bankTransactions: [],
      insights: [],
    };

    const response = answerIntentCompliance({
      intent: 'risks',
      context,
      targetInsightId: null,
      prompt: 'Show me risks',
    });

    expect(response.confidence).toBeNull();
    expect(response.summary).not.toMatch(/0%/);
  });
});
