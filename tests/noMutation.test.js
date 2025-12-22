// noMutation.test.js
// Ensures no automation can mutate data in Phase 13.

const { runAutomation } = require('../src/services/ai/automation/automationEngine');

describe('No Mutation', () => {
  it('should not allow any data mutation', async () => {
    // Should throw if mutation intent in prompt
    await expect(runAutomation({
      userId: 1,
      companyId: 1,
      context: { prompt: 'delete all invoices' },
      method: 'GET',
    })).rejects.toThrow('Mutation intent detected');

    // Should throw if method is not GET
    await expect(runAutomation({
      userId: 1,
      companyId: 1,
      context: { prompt: 'just read' },
      method: 'POST',
    })).rejects.toThrow('Only GET/read-only methods are allowed');
  });
});
