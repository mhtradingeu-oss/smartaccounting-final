// Phase 3 AI intelligence tests: explainability, audit, human-in-the-loop, compliance
const { buildExplainability } = require('../../../src/services/ai/explainability');
const { logAIEvent } = require('../../../src/services/ai/auditLogger');
const { ApprovalState, handleApprovalAction } = require('../../../src/services/ai/approvalState');
const { enforcePurposeLimitation, addAIDisclaimer } = require('../../../src/services/ai/governance');
const { suggestExpenseCategory, detectInvoiceAnomaly, detectVATRisk, detectMissingDocument, complianceRiskScore } = require('../../../src/services/ai/insightTypes');

describe('AI Explainability', () => {
  it('should build a valid explainability object', () => {
    const exp = buildExplainability({
      why: 'Test',
      dataPoints: ['a'],
      ruleOrModel: 'TestRule',
      confidence: 0.8,
      legalContext: 'TestLaw',
    });
    expect(exp).toHaveProperty('why', 'Test');
    expect(exp).toHaveProperty('dataPoints');
    expect(exp).toHaveProperty('ruleOrModel');
    expect(exp).toHaveProperty('confidence');
    expect(exp).toHaveProperty('legalContext');
  });
});

describe('AI Governance', () => {
  it('should enforce purpose limitation', () => {
    const input = { a: 1, b: 2, c: 3 };
    const filtered = enforcePurposeLimitation(input, ['a', 'c']);
    expect(filtered).toEqual({ a: 1, c: 3 });
  });
  it('should add AI disclaimer', () => {
    const out = addAIDisclaimer({ foo: 'bar' });
    expect(out).toHaveProperty('disclaimer');
  });
});

describe('Human-in-the-loop Approval', () => {
  it('should require reason for rejection', () => {
    expect(() => handleApprovalAction({ suggestionId: '1', userId: 'u', action: ApprovalState.REJECTED })).toThrow();
  });
  it('should allow acceptance without reason', () => {
    const res = handleApprovalAction({ suggestionId: '1', userId: 'u', action: ApprovalState.ACCEPTED });
    expect(res.action).toBe(ApprovalState.ACCEPTED);
  });
});

describe('AI Insight Types', () => {
  it('should suggest expense category with explainability', () => {
    const out = suggestExpenseCategory({ vendor: 'A', amount: 10, date: '2025-01-01' }, { A: 'Travel' });
    expect(out).toHaveProperty('explainability');
  });
  it('should detect invoice duplicate anomaly', () => {
    const inv = { id: 1, number: 'X', amount: 100, date: '2025-01-01' };
    const all = [inv, { id: 2, number: 'X', amount: 100, date: '2025-01-01' }];
    const out = detectInvoiceAnomaly(inv, all);
    expect(out).not.toBeNull();
    expect(out).toHaveProperty('anomaly', 'duplicate');
  });
  it('should detect VAT rate mismatch', () => {
    const inv = { vatRate: 0.19, country: 'DE', vat: 19, net: 100, gross: 119 };
    const out = detectVATRisk(inv, { DE: 0.07, default: 0.19 });
    expect(out).not.toBeNull();
    expect(out).toHaveProperty('risk', 'rate_mismatch');
  });
  it('should detect missing document', () => {
    const out = detectMissingDocument({ id: 1, date: '2025-01-01', amount: 10 });
    expect(out).not.toBeNull();
    expect(out).toHaveProperty('type', 'missing_document');
  });
  it('should score compliance risk', () => {
    const out = complianceRiskScore({}, Array(10).fill({}));
    expect(out).toHaveProperty('score', 'MEDIUM');
  });
});
