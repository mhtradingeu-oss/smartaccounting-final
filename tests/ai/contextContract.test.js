const { sanitizeContext } = require('../../src/services/ai/contextContract');

describe('AI Context Contract', () => {
  it('returns minimal, versioned, tenant-safe context', () => {
    const raw = {
      company: { id: 1, name: 'TestCo', country: 'DE', secret: 'x' },
      invoices: [{ id: 1, status: 'paid', total: 100, currency: 'EUR', hack: true }],
      expenses: [],
      bankTransactions: [],
      insights: [],
      injected: 'should-not-exist',
    };

    const ctx = sanitizeContext(raw);

    expect(ctx.version).toBeDefined();
    expect(ctx.injected).toBeUndefined();
    expect(ctx.company.secret).toBeUndefined();
    expect(ctx.invoices[0].hack).toBeUndefined();
  });
});
