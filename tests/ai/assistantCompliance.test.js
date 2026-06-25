const { answerIntentCompliance } = require('../../src/services/ai/aiAssistantService');

const brokenFormattingPattern =
  /Pendinginvoice|missingapproval|overdue\.Expenses|\b(?:14|15)\.Apr\.|Evidencenot|invoiceand|paymentneeds|itmatters|Source\/evidence:Evidence|contextBank|;entity|;evidence|invoice\.\.|unreconciled\.\.|matching\.\.|invoicefocus|on15|for4|€\.-|\.-\s|riskto|notprovided|provided\.\./i;

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

  it('prioritizes review focus across overdue invoices, unreconciled transactions, and high insights', () => {
    const response = answerIntentCompliance({
      intent: 'review',
      context: {
        company: { id: 1, name: 'Example GmbH', taxId: 'DE123456789' },
        invoices: [
          {
            id: 17,
            status: 'OVERDUE',
            total: 4998,
            currency: 'EUR',
            dueDate: '2026-05-17',
          },
          {
            id: 18,
            status: 'SENT',
            total: 3998,
            currency: 'EUR',
            dueDate: '2026-06-17',
          },
        ],
        expenses: [{ id: 2, status: 'pending', grossAmount: 42, currency: 'EUR' }],
        bankTransactions: [
          {
            id: 9,
            description: 'Unmatched incoming payment',
            amount: 4998,
            currency: 'EUR',
            transactionDate: '2026-04-15',
            isReconciled: false,
          },
        ],
        insights: [
          {
            id: 4,
            entityType: 'invoice',
            entityId: 17,
            type: 'collection_risk',
            severity: 'high',
            summary: 'Pendinginvoice focus has missingapproval and overdue.Expenses on 15.Apr. 2026 for invoiceand remains unresolved..',
            why: 'Payment matching.. needs review',
            ruleId: 'INV_OVERDUE',
            dataSource: 'contextBank reconciliation',
            confidenceScore: 0.92,
          },
        ],
      },
      targetInsightId: null,
      prompt: 'What should I review?',
    });

    expect(response.summary).toMatch(/Prioritized accounting review/i);
    expect(response.summary).toMatch(/Top risk to review first/i);
    expect(response.summary).toMatch(/Evidence not provided/i);
    expect(response.summary).toMatch(/transaction on 15/i);
    expect(response.summary).toMatch(/for 4/);
    expect(response.summary).toMatch(/Overdue invoice focus/i);
    expect(response.summary).toMatch(/Unreconciled bank transaction focus/i);
    expect(response.risks.join(' ')).toMatch(/Evidence\/reference/i);
    expect(response.requiredActions.join(' ')).toMatch(/Reconcile unreconciled bank transactions/i);
    expect(JSON.stringify(response)).not.toContain('DE123456789');
    expect(response.summary).toMatch(/\n- Top risk/);
    expect(response.summary).not.toMatch(brokenFormattingPattern);
    expect(response.risks.join(' ')).not.toMatch(
      brokenFormattingPattern,
    );
    expect(response.references.join(' ')).not.toMatch(brokenFormattingPattern);
  });

  it('normalizes final explain transaction response formatting', () => {
    const response = answerIntentCompliance({
      intent: 'explain_transaction',
      context: {
        company: { id: 1, name: 'Example GmbH' },
        invoices: [{ id: 17, status: 'OVERDUE', total: 4998, currency: 'EUR' }],
        expenses: [{ id: 8, status: 'pending', grossAmount: 125, currency: 'EUR' }],
        bankTransactions: [
          {
            id: 9,
            description: 'Partial paymentneeds reconciliation',
            amount: 4998,
            currency: 'EUR',
            transactionDate: '2026-04-15',
            isReconciled: false,
          },
        ],
        insights: [
          {
            id: 9,
            entityType: 'bankTransaction',
            entityId: 9,
            type: 'reconciliation_risk',
            severity: 'high',
            summary: 'Partial paymentneeds reconciliation for invoiceand remains unresolved on 15.Apr. 2026..',
            why: 'Why itmatters: payment matching.. is incomplete after 14.Apr. 2026',
            evidence: ['Source/evidence:Evidencenot from bank', 'Invoices;entity invoice 17', 'expense 8;evidence missing'],
            legalContext: 'Bank reconciliation context',
            ruleId: 'BANK_MATCH',
            dataSource: 'Bank transactions',
            confidenceScore: 0.88,
          },
        ],
      },
      targetInsightId: 9,
      prompt: 'Explain transaction',
    });

    expect(response.summary).not.toMatch(brokenFormattingPattern);
    expect(response.risks.join(' ')).not.toMatch(brokenFormattingPattern);
    expect(response.references.join(' ')).not.toMatch(brokenFormattingPattern);
  });

  it('normalizes final why flagged response formatting', () => {
    const response = answerIntentCompliance({
      intent: 'why_flagged',
      context: {
        company: { id: 1, name: 'Example GmbH' },
        invoices: [{ id: 17, status: 'OVERDUE', total: 4998, currency: 'EUR' }],
        expenses: [{ id: 8, status: 'pending', grossAmount: 125, currency: 'EUR' }],
        bankTransactions: [
          {
            id: 9,
            description: 'Partial paymentneeds reconciliation',
            amount: 4998,
            currency: 'EUR',
            transactionDate: '2026-04-15',
            isReconciled: false,
          },
        ],
        insights: [
          {
            id: 10,
            entityType: 'bankTransaction',
            entityId: 9,
            type: 'reconciliation_risk',
            severity: 'high',
            summary: 'Partial paymentneeds reconciliation for invoiceand remains unresolved on 15.Apr. 2026..',
            why: 'Payment matching.. needs review',
            evidence: ['Invoices;entity invoice 17'],
            legalContext: 'contextBank reconciliation..',
            ruleId: 'demo:late-payment-risk',
            dataSource: 'contextBank reconciliation',
            confidenceScore: 0.88,
          },
        ],
      },
      targetInsightId: 10,
      prompt: 'Why flagged?',
    });

    expect(response.summary).not.toMatch(brokenFormattingPattern);
    expect(response.risks.join(' ')).not.toMatch(brokenFormattingPattern);
    expect(response.references.join(' ')).not.toMatch(brokenFormattingPattern);
    expect(JSON.stringify(response)).toContain('bankTransaction');
    expect(JSON.stringify(response)).toContain('demo:late-payment-risk');
    expect(JSON.stringify(response)).not.toContain('bank Transaction');
    expect(JSON.stringify(response)).not.toContain('demo: late-payment-risk');
  });

  it('orders risk intent output by severity and includes source evidence', () => {
    const response = answerIntentCompliance({
      intent: 'risks',
      context: {
        company: { id: 1, name: 'Example GmbH' },
        invoices: [{ id: 1, status: 'PAID', total: 100, currency: 'EUR' }],
        expenses: [{ id: 2, status: 'approved', grossAmount: 42, currency: 'EUR' }],
        bankTransactions: [{ id: 3, amount: 100, currency: 'EUR', isReconciled: true }],
        insights: [
          {
            id: 1,
            entityType: 'expense',
            entityId: 2,
            severity: 'low',
            summary: 'Receipt metadata incomplete',
            dataSource: 'Expenses',
          },
          {
            id: 2,
            entityType: 'invoice',
            entityId: 1,
            severity: 'high',
            summary: 'Possible VAT mismatch',
            dataSource: 'Invoices',
          },
          {
            id: 3,
            entityType: 'bank_transaction',
            entityId: 3,
            severity: 'medium',
            summary: 'Bank reference needs review',
            dataSource: 'Bank transactions',
          },
        ],
      },
      targetInsightId: null,
      prompt: 'Show risks',
    });

    expect(response.risks[0]).toMatch(/^HIGH risk/i);
    expect(response.risks[1]).toMatch(/^MEDIUM risk/i);
    expect(response.risks[2]).toMatch(/^LOW risk/i);
    expect(response.risks.join(' ')).toMatch(/Source: Invoices/i);
    expect(response.risks.join(' ')).toMatch(/evidence/i);
  });

  it('explains missing flagged data as data gaps without hallucinated facts', () => {
    const response = answerIntentCompliance({
      intent: 'explain_transaction',
      context: {
        company: { id: 1, name: 'Example GmbH' },
        invoices: [],
        expenses: [],
        bankTransactions: [],
        insights: [],
      },
      targetInsightId: null,
      prompt: 'Explain transaction 999',
    });

    expect(response.summary).toMatch(/data not available/i);
    expect(response.summary).toMatch(/no supplied insight/i);
    expect(response.dataGaps).toEqual(
      expect.arrayContaining([
        'Invoices data not available',
        'Bank transactions data not available',
        'AI insights data not available',
      ]),
    );
    expect(response.summary).not.toMatch(/999.*€|EUR 999/i);
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

  it('keeps assistant actions read-only and escalates German tax conclusions', () => {
    const response = answerIntentCompliance({
      intent: 'review',
      context: {
        company: { id: 1, name: 'Boundary GmbH' },
        invoices: [
          {
            id: 101,
            status: 'SENT',
            total: 1190,
            currency: 'EUR',
            dueDate: '2026-06-30',
          },
        ],
        expenses: [
          {
            id: 202,
            status: 'pending',
            grossAmount: 238,
            vatAmount: 38,
            currency: 'EUR',
          },
        ],
        bankTransactions: [
          {
            id: 303,
            amount: 1190,
            currency: 'EUR',
            transactionDate: '2026-06-21',
            isReconciled: false,
          },
        ],
        insights: [
          {
            id: 404,
            entityType: 'expense',
            entityId: 202,
            type: 'vat_risk',
            severity: 'high',
            summary: 'Input VAT evidence requires review.',
            why: 'VAT treatment depends on source document readiness.',
            evidence: ['Expense 202 has pending review state'],
            legalContext: 'UStG §14, §15',
            ruleId: 'VAT_REVIEW_REQUIRED',
            confidenceScore: 0.84,
          },
        ],
      },
      targetInsightId: null,
      prompt: 'Can I file VAT and claim input VAT now?',
    });

    const actions = response.requiredActions.join(' ');

    expect(actions).toMatch(/Keep the assistant read-only/i);
    expect(actions).toMatch(/normal reviewed accounting workflow/i);
    expect(actions).toMatch(/qualified Steuerberater/i);
    expect(actions).toMatch(/German tax, VAT filing, payment, or legal conclusions/i);

    expect(actions).not.toMatch(/\b(file|submit|pay|post|create|delete|change)\b.*\bnow\b/i);
    expect(JSON.stringify(response)).toMatch(/UStG §14, §15|VAT/i);
  });

  it('does not invent tax amounts when VAT evidence is missing', () => {
    const response = answerIntentCompliance({
      intent: 'review',
      context: {
        company: { id: 1, name: 'Missing VAT GmbH' },
        invoices: [],
        expenses: [],
        bankTransactions: [],
        insights: [
          {
            id: 505,
            entityType: 'document',
            entityId: 'doc-505',
            type: 'missing_document',
            severity: 'high',
            summary: 'VAT amount was not detected.',
            why: 'Source document does not contain enough VAT evidence.',
            evidence: [],
            legalContext: 'UStG §14',
            ruleId: 'VAT_EVIDENCE_MISSING',
            confidenceScore: 0.7,
          },
        ],
      },
      targetInsightId: null,
      prompt: 'Calculate the VAT amount and tell me what to pay',
    });

    expect(response.summary).toMatch(/data not available/i);
    expect(response.dataGaps).toEqual(
      expect.arrayContaining([
        'Invoices data not available',
        'Expenses data not available',
        'Bank transactions data not available',
      ]),
    );

    expect(response.summary).not.toMatch(/\b(19|7)\s?%.*(pay|file|submit)/i);
    expect(response.requiredActions.join(' ')).toMatch(/Steuerberater/i);
  });
