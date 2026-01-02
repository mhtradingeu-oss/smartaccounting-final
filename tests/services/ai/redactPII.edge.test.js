const { redactPII } = require('../../../src/services/ai/governance');

describe('redactPII edge cases', () => {
  it('does not let phone regex consume IBAN', () => {
    const input = 'IBAN DE89370400440532013000 and phone +491234567890';
    const out = redactPII(input);
    expect(out).toContain('[REDACTED_IBAN]');
    expect(out).toContain('[REDACTED_PHONE]');
    expect(out).not.toMatch(/32013000/); // IBAN digits not left over
  });

  it('does not let phone regex consume credit card', () => {
    const input = 'Card 4111 1111 1111 1111 and phone +491234567890';
    const out = redactPII(input);
    expect(out).toContain('[REDACTED_CREDITCARD]');
    expect(out).toContain('[REDACTED_PHONE]');
    expect(out).not.toMatch(/1111 1111/);
  });

  it('does not let IBAN regex consume phone', () => {
    const input = 'Phone +491234567890 and IBAN DE89370400440532013000';
    const out = redactPII(input);
    expect(out).toContain('[REDACTED_PHONE]');
    expect(out).toContain('[REDACTED_IBAN]');
  });

  it('does not let credit card regex consume IBAN', () => {
    const input = 'IBAN DE89370400440532013000 and card 4111111111111111';
    const out = redactPII(input);
    expect(out).toContain('[REDACTED_IBAN]');
    expect(out).toContain('[REDACTED_CREDITCARD]');
  });

  it('redacts all types in a mixed string', () => {
    const input =
      'Email john@x.com, phone +491234567890, IBAN DE89370400440532013000, card 4111111111111111, tax DE12345678901, address Hauptstrasse 1, 10115 Berlin';
    const out = redactPII(input);
    expect(out).toContain('[REDACTED_EMAIL]');
    expect(out).toContain('[REDACTED_PHONE]');
    expect(out).toContain('[REDACTED_IBAN]');
    expect(out).toContain('[REDACTED_CREDITCARD]');
    expect(out).toContain('[REDACTED_TAXID]');
    expect(out).toContain('[REDACTED_ADDRESS]');
  });
});
