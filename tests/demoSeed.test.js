const demoSeed = require('../database/seeders/demo/20251226-demo-seed.js');

describe('Demo seed bank statement template', () => {
  it('provides a deterministic statementDate that matches the statementPeriodEnd', () => {
    const { BANK_STATEMENT_TEMPLATE } = demoSeed;
    expect(BANK_STATEMENT_TEMPLATE).toBeDefined();
    expect(BANK_STATEMENT_TEMPLATE.statementPeriodEnd).toBeDefined();
    expect(BANK_STATEMENT_TEMPLATE.statementDate).toBeDefined();
    expect(BANK_STATEMENT_TEMPLATE.statementDate).toBe(
      BANK_STATEMENT_TEMPLATE.statementPeriodEnd,
    );
  });
});
