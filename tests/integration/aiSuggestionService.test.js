const { getSuggestion } = require('../../src/services/ai/aiSuggestionService');

describe('AI Suggestion Service (Phase 12)', () => {
  it('should only return read-only suggestions', async () => {
    const params = {
      userId: 1,
      companyId: 1,
      prompt: 'What should I do with invoice #1234?',
      context: {},
    };
    const suggestion = await getSuggestion(params);
    expect(suggestion).toBeDefined();
    expect(suggestion.advisory).toBe(true);
    expect(typeof suggestion.confidence).toBe('number');
    expect(typeof suggestion.explanation).toBe('string');
    expect(['low','medium','high']).toContain(suggestion.severity);
    expect(typeof suggestion.relatedEntity).toBe('string');
  });

  it('should reject mutation intent', async () => {
    const params = {
      userId: 1,
      companyId: 1,
      prompt: 'Please update invoice #1234',
      context: {},
    };
    await expect(getSuggestion(params)).rejects.toThrow('Mutation intent detected');
  });
});
