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

  it('formats accounting lines without undefined labels or broken redaction', () => {
    const context = {
      company: { id: 1, name: 'Example GmbH' },
      invoices: [
        {
          id: 17,
          invoiceNumber: null,
          status: 'OVERDUE',
          total: 2570.4,
          currency: 'EUR',
          dueDate: '2026-05-17',
        },
        {
          id: 18,
          status: 'DRAFT',
          total: 3998,
          currency: 'EUR',
          dueDate: '2026-06-17',
        },
      ],
      expenses: [{ id: 2, status: 'pending', grossAmount: 42, currency: 'EUR' }],
      bankTransactions: [
        {
          id: 9,
          description: 'Payment from customer@example.com',
          amount: 2570.4,
          currency: 'EUR',
          transactionDate: '2026-05-20',
          isReconciled: false,
        },
      ],
      insights: [
        { id: 1, severity: 'high', confidenceScore: 0.9 },
        { id: 2, severity: 'medium', confidenceScore: 0.7 },
        { id: 3, severity: 'medium', confidenceScore: 0.7 },
        { id: 4, severity: 'low', confidenceScore: 0.3 },
        { id: 5, severity: 'low', confidenceScore: 0.3 },
      ],
    };

    const response = answerIntentCompliance({
      intent: 'review',
      context,
      targetInsightId: null,
      prompt: 'Summarize status',
    });
    const serialized = JSON.stringify(response);

    expect(serialized).not.toMatch(/undefined/);
    expect(serialized).not.toMatch(/\[REDACTED_ADDRESS\]/);
    expect(serialized).toMatch(/invoice #17/);
    expect(serialized).toMatch(/draft invoice #18/);
    expect(serialized).toMatch(/2\.570,40\s?€/);
    expect(response.contextSummary).toContain('Insights: 5 total (high 1, medium 2, low 2).');
  });

  it('still redacts obviously sensitive free-text prompt input', () => {
    const response = answerIntentCompliance({
      intent: 'review',
      context: {
        company: { id: 1, name: 'Example GmbH' },
        invoices: [],
        expenses: [],
        bankTransactions: [],
        insights: [],
      },
      targetInsightId: null,
      prompt: 'Contact john.doe@example.com with IBAN DE89370400440532013000',
    });

    expect(response.sanitizedPrompt).toContain('[REDACTED_EMAIL]');
    expect(response.sanitizedPrompt).toContain('[REDACTED_IBAN]');
    expect(response.sanitizedPrompt).not.toContain('john.doe@example.com');
    expect(response.sanitizedPrompt).not.toContain('DE89370400440532013000');
  });
});
