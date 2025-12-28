const request = require('../utils/request');
const app = require('../../src/app');
const { AIInsight, sequelize } = require('../../src/models');
const { createTestCompany } = require('../utils/createTestCompany');
const testUtils = require('../utils/testHelpers');

describe('AI Insights API', () => {
  let admin, adminToken, accountant, accountantToken, viewer, viewerToken, company;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    company = await createTestCompany();
    admin = await testUtils.createTestUser({ role: 'admin', companyId: company.id });
    accountant = await testUtils.createTestUser({ role: 'accountant', companyId: company.id });
    viewer = await testUtils.createTestUser({ role: 'viewer', companyId: company.id });
    adminToken = testUtils.createAuthToken(admin.id);
    accountantToken = testUtils.createAuthToken(accountant.id);
    viewerToken = testUtils.createAuthToken(viewer.id);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should block access when AI is disabled', async () => {
    await company.update({ aiEnabled: false });
    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(501);
    expect(res.body).toEqual({ status: 'disabled', feature: 'AI Insights' });
    await company.update({ aiEnabled: true });
  });

  it('should scope insights by company', async () => {
    // Seed one insight for primary company
    await AIInsight.create({
      companyId: company.id,
      entityType: 'invoice',
      entityId: 'inv-iso',
      type: 'invoice_anomaly',
      severity: 'medium',
      confidenceScore: 0.75,
      summary: 'Scoped test',
      why: 'Scoped test',
      legalContext: 'GoBD',
      evidence: [],
      ruleId: 'rule-scope',
      modelVersion: 'v1',
      featureFlag: 'default',
      disclaimer: 'Suggestion only — not binding',
    });

    const otherCompany = await createTestCompany({
      name: 'OtherCo',
      taxId: 'DE000000000',
      address: 'Test Address 5',
    });
    const otherAdmin = await testUtils.createTestUser({
      role: 'admin',
      companyId: otherCompany.id,
    });
    const otherToken = testUtils.createAuthToken(otherAdmin.id);

    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.body.insights).toEqual([]);
  });

  it('should keep AI endpoints read-only (decisions disabled)', async () => {
    const insight = await AIInsight.create({
      companyId: company.id,
      entityType: 'invoice',
      entityId: 'inv-readonly',
      type: 'invoice_anomaly',
      severity: 'low',
      confidenceScore: 0.5,
      summary: 'Read-only',
      why: 'Read-only',
      legalContext: 'GoBD',
      evidence: [],
      ruleId: 'rule-read',
      modelVersion: 'v1',
      featureFlag: 'default',
      disclaimer: 'Suggestion only — not binding',
    });

    const res = await request(app)
      .post(`/api/ai/insights/${insight.id}/decisions`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ decision: 'accepted', reason: 'Test' });
    expect(res.status).toBe(501);
    expect(res.body).toHaveProperty('feature', 'AI decision capture');
  });

  it('should flag viewers as limited and cap the feed', async () => {
    await AIInsight.bulkCreate(
      Array.from({ length: 5 }, (_, index) => ({
        companyId: company.id,
        entityType: 'invoice',
        entityId: `inv-${index}`,
        type: 'invoice_anomaly',
        severity: 'low',
        confidenceScore: 0.4 + index * 0.1,
        summary: `Entry ${index}`,
        why: 'Viewer limit test',
        legalContext: 'GoBD',
        evidence: [],
        ruleId: `rule-${index}`,
        modelVersion: 'v1',
        featureFlag: 'default',
        disclaimer: 'Suggestion only — not binding',
      })),
    );

    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.viewerLimited).toBe(true);
    expect(res.body.insights.length).toBeLessThanOrEqual(3);
  });
});
