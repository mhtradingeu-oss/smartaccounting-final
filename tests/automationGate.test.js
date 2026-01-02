// automationGate.test.js
// Tests for Phase 13 automation gates (no mutation, explainability, audit).

const {
  assertNoMutationIntent,
  assertReadOnlyContext,
  assertSuggestionValid,
} = require('../src/services/ai/automation/automationGuard');
const {
  validateAutomationSuggestion,
} = require('../src/services/ai/automation/automationContract');

describe('Automation Gate', () => {
  it('should reject mutation attempts in prompt', () => {
    expect(() => assertNoMutationIntent('Please delete invoice')).toThrow(
      'Mutation intent detected',
    );
    expect(() => assertNoMutationIntent('Update the record')).toThrow('Mutation intent detected');
    expect(() => assertNoMutationIntent('Just read')).not.toThrow();
  });

  it('should only allow GET/read-only methods', () => {
    expect(() => assertReadOnlyContext({ method: 'GET' })).not.toThrow();
    expect(() => assertReadOnlyContext({ method: 'POST' })).toThrow(
      'Only GET/read-only methods are allowed',
    );
    expect(() => assertReadOnlyContext({ method: 'DELETE' })).toThrow(
      'Only GET/read-only methods are allowed',
    );
  });

  it('should validate required suggestion fields', () => {
    const validSuggestion = {
      id: 's1',
      type: 'duplicateInvoice',
      severity: 'medium',
      confidence: 0.9,
      title: 'Possible duplicate',
      explanation: 'Found similar invoice.',
      evidence: [],
      relatedEntities: [],
      recommendedNextStep: 'Review',
      requiresHumanApproval: true,
    };
    expect(() => assertSuggestionValid(validSuggestion)).not.toThrow();
    const missingField = { ...validSuggestion };
    delete missingField.title;
    expect(() => assertSuggestionValid(missingField)).toThrow('title');
    const notHuman = { ...validSuggestion, requiresHumanApproval: false };
    expect(() => assertSuggestionValid(notHuman)).toThrow('requiresHumanApproval must be true');
  });
});
