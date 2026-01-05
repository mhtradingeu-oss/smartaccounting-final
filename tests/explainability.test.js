// explainability.test.js
// Ensures all automations provide explanations and confidence scores.

const { runAutomation } = require('../src/services/ai/automation/automationEngine');

describe('Explainability', () => {
  it('should require explanation and confidence', async () => {
    const suggestions = await runAutomation({
      userId: 1,
      companyId: 1,
      context: { prompt: 'find duplicates' },
      method: 'GET',
      requestId: 'explainability-test',
    });
    expect(Array.isArray(suggestions)).toBe(true);
    for (const s of suggestions) {
      expect(typeof s.explanation).toBe('string');
      expect(typeof s.confidence).toBe('number');
      expect(s.requiresHumanApproval).toBe(true);
      expect(Array.isArray(s.evidence)).toBe(true);
    }
  });
});
