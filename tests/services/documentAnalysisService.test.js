const { analyzeDocument } = require('../../src/services/documentAnalysisService');

describe('documentAnalysisService', () => {
  it('rejects invoices missing required fields', () => {
    const result = analyzeDocument({
      text: 'Rechnung',
      extractedData: {
        date: '01.01.2025',
        totalAmount: 120,
      },
      documentType: 'invoice',
    });

    expect(result.compliance.status).toBe('rejected');
    expect(result.compliance.errors.join(' ')).toMatch(/invoice number/i);
  });

  it('marks empty extractions as draft', () => {
    const result = analyzeDocument({
      text: '',
      extractedData: {},
      documentType: 'receipt',
    });

    expect(result.compliance.status).toBe('draft');
  });
});
