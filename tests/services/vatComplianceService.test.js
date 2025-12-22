const vatComplianceService = require('../../src/services/vatComplianceService');

describe('VAT/UStG Compliance Engine', () => {
  it('accepts valid 19% VAT transaction', () => {
    const result = vatComplianceService.validateTransaction({ net: 100, vat: 19, gross: 119, vatRate: 19, currency: 'EUR' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects illegal VAT rate', () => {
    const result = vatComplianceService.validateTransaction({ net: 100, vat: 15, gross: 115, vatRate: 15, currency: 'EUR' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('VAT_RATE_ILLEGAL');
  });

  it('rejects non-EUR currency', () => {
    const result = vatComplianceService.validateTransaction({ net: 100, vat: 19, gross: 119, vatRate: 19, currency: 'USD' });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('CURRENCY_ILLEGAL');
  });

  it('rejects VAT math mismatch', () => {
    const result = vatComplianceService.validateTransaction({ net: 100, vat: 20, gross: 120, vatRate: 19, currency: 'EUR' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'VAT_MISMATCH')).toBe(true);
  });

  it('rejects gross math mismatch', () => {
    const result = vatComplianceService.validateTransaction({ net: 100, vat: 19, gross: 120, vatRate: 19, currency: 'EUR' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'GROSS_MISMATCH')).toBe(true);
  });
});
