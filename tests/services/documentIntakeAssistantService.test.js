const documentIntakeAssistantService = require('../../src/services/ai/documentIntakeAssistantService');

describe('documentIntakeAssistantService', () => {
  it('classifies receipt-like OCR text as create_expense_draft', () => {
    const result = documentIntakeAssistantService.analyzeIntake({
      text: 'Quittung DB Vertrieb GmbH 18.06.2026 Gesamt 11,90 EUR MwSt 1,90',
      documentType: 'auto',
      documentId: 'doc-1',
      extractedData: {
        type: 'receipt',
        vendor: 'DB Vertrieb GmbH',
        date: '18.06.2026',
        amount: 11.9,
        vatAmount: 1.9,
      },
    });

    expect(result.classification.documentType).toBe('receipt');
    expect(result.classification.suggestedAction).toBe('create_expense_draft');
    expect(result.draft.targetRoute).toBe('POST /api/expenses');
    expect(result.audit.advisoryOnly).toBe(true);
    expect(result.audit.requiresHumanConfirmation).toBe(true);
  });

  it('classifies bank statement-like OCR text as bank_statement_dry_run', () => {
    const result = documentIntakeAssistantService.analyzeIntake({
      text: 'Kontoauszug IBAN DE89370400440532013000 Anfangssaldo Endsaldo Zeitraum 01.06.2026 - 30.06.2026',
      documentType: 'auto',
      documentId: 'doc-bank',
      extractedData: {
        type: 'bank_statement',
        accountNumber: 'DE89370400440532013000',
        period: '01.06.2026 - 30.06.2026',
      },
    });

    expect(result.classification.documentType).toBe('bank_statement');
    expect(result.classification.suggestedAction).toBe('bank_statement_dry_run');
    expect(result.draft.targetRoute).toBe('POST /api/bank-statements/import?dryRun=true');
  });

  it('flags implausible VAT math as needs_correction', () => {
    const result = documentIntakeAssistantService.analyzeIntake({
      text: 'Rechnung Supplier GmbH Gesamt 119 EUR Netto 100 EUR MwSt 10 EUR',
      documentType: 'invoice',
      documentId: 'doc-bad',
      extractedData: {
        invoiceNumber: 'R-1',
        vendor: 'Supplier GmbH',
        date: '18.06.2026',
        netAmount: 100,
        vatAmount: 10,
        totalAmount: 119,
        vatRate: 0.19,
      },
    });

    expect(result.classification.suggestedAction).toBe('needs_correction');
    expect(result.validation.errors.join(' ')).toMatch(/Net \+ VAT/i);
  });
});
