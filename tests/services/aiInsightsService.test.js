const { sequelize, AIInsight, AIInsightDecision, User, Company } = require('../../src/models');
const { createTestCompany } = require('../utils/createTestCompany');
const aiInsightsService = require('../../src/services/ai/aiInsightsService');

describe('aiInsightsService', () => {
  let company, admin, accountant, viewer;

  beforeEach(async () => {
    company = await createTestCompany();
    // Create a system user with id 0 for AI/system actions
    await User.create({
      id: 0,
      email: 'system@ai.com',
      password: 'x',
      firstName: 'System',
      lastName: 'AI',
      role: 'admin',
      companyId: company.id,
    });
    admin = await User.create({
      email: 'admin@serviceco.com',
      password: 'x',
      firstName: 'A',
      lastName: 'A',
      role: 'admin',
      companyId: company.id,
    });
    accountant = await User.create({
      email: 'acc@serviceco.com',
      password: 'x',
      firstName: 'B',
      lastName: 'B',
      role: 'accountant',
      companyId: company.id,
    });
    viewer = await User.create({
      email: 'viewer@serviceco.com',
      password: 'x',
      firstName: 'C',
      lastName: 'C',
      role: 'viewer',
      companyId: company.id,
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await User.destroy({ where: {} });
    await Company.destroy({ where: {} });
  });

  it('should block if aiEnabled=false', async () => {
    await company.update({ aiEnabled: false });
    const result = await aiInsightsService.listInsights(company.id);
    expect(result).toEqual([]);
    await company.update({ aiEnabled: true });
  });

  it('should persist insights matching contract', async () => {
    await company.update({ aiEnabled: true });
    const context = {
      invoices: [
        { id: 'inv-1', number: 'X', amount: 100, date: '2025-01-01' },
        { id: 'inv-2', number: 'X', amount: 100, date: '2025-01-01' },
      ],
    };
    const insights = await aiInsightsService.generateInsightsForCompany(company.id, context);
    expect(Array.isArray(insights)).toBe(true);
    expect(insights[0]).toHaveProperty('companyId', company.id);
    expect(insights[0]).toHaveProperty('entityType');
    expect(insights[0]).toHaveProperty('type');
    expect(insights[0]).toHaveProperty('ruleId');
    expect(insights[0]).toHaveProperty('modelVersion');
    expect(insights[0]).toHaveProperty('disclaimer');
  });

  it('should not mutate invoices/expenses during insight generation', async () => {
    await company.update({ aiEnabled: true });
    const orig = { id: 'inv-3', number: 'Y', amount: 200, date: '2025-01-01' };
    const context = { invoices: [Object.assign({}, orig)] };
    await aiInsightsService.generateInsightsForCompany(company.id, context);
    expect(context.invoices[0]).toEqual(orig);
  });
});
