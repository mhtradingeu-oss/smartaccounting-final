const { getSuggestion } = require('../../src/services/ai/aiSuggestionService');

describe('AI Suggestion Service (Phase 12)', () => {
  const buildSystemContext = require('../utils/buildSystemContext');
  const { Company, User } = require('../../src/models');
  let testCompany, testUser;
  beforeAll(async () => {
    testCompany = await Company.create({
      name: 'AISuggTestCo',
      taxId: 'AISUGG-123',
      aiEnabled: true,
      address: 'Test',
      city: 'Test',
      postalCode: '00000',
      country: 'Testland',
    });
    testUser = await User.create({
      email: 'aisugguser@test.com',
      password: 'testpass',
      firstName: 'AISugg',
      lastName: 'User',
      companyId: testCompany.id,
      role: 'admin',
      isActive: true,
    });
  });

  afterAll(async () => {
    const { sequelize } = require('../../src/models');
    await sequelize.truncate({ cascade: true, restartIdentity: true });
  });

  it('should only return read-only suggestions', async () => {
    const { createValidSystemContext } = require('../utils/testHelpers');
    const context = {
      user: { id: testUser.id, companyId: testCompany.id },
      role: testUser.role,
      eventClass: 'AI',
      scopeType: 'COMPANY',
      status: 'ALLOWED',
      reason: 'Test execution',
    };
    const params = {
      prompt: 'What should I do with invoice #1234?',
      companyId: testCompany.id,
      userId: testUser.id,
      context,
    };
    const suggestion = await getSuggestion(params);
    expect(suggestion).toBeDefined();
    expect(suggestion.advisory).toBe(true);
    expect(typeof suggestion.confidence).toBe('number');
    expect(typeof suggestion.explanation).toBe('string');
    expect(['low', 'medium', 'high']).toContain(suggestion.severity);
    expect(typeof suggestion.relatedEntity).toBe('string');
  });

  it('should reject mutation intent', async () => {
    const params = {
      userId: testUser.id,
      companyId: testCompany.id,
      prompt: 'Please update invoice #1234',
      context: {
        user: { id: testUser.id, companyId: testCompany.id },
        role: testUser.role,
        eventClass: 'AI',
        scopeType: 'COMPANY',
        status: 'ALLOWED',
        reason: 'Test mutation rejection',
      },
    };
    await expect(getSuggestion(params)).rejects.toThrow('Mutation intent detected');
  });
});
