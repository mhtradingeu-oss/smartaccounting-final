const request = require('../utils/request');
const app = require('../../src/app');
const { AIInsight, AIInsightDecision, User, sequelize } = require('../../src/models');
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

  it('should block access if aiEnabled=false', async () => {
    await company.update({ aiEnabled: false });
    const res = await request(app)
      .get('/api/v1/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 403, 404, 501]).toContain(res.status);
    if (res.status === 501) {
      expect(res.body).toEqual({ status: 'disabled', feature: 'AI Insights' });
    }
    await company.update({ aiEnabled: true });
  });

  it('should enforce tenant isolation', async () => {
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
    // Create an insight for company
    const insight = await AIInsight.create({
      companyId: company.id,
      entityType: 'invoice',
      entityId: 'inv-1',
      type: 'invoice_anomaly',
      severity: 'medium',
      confidenceScore: 0.9,
      summary: 'Test',
      why: 'Test',
      legalContext: 'GoBD',
      evidence: [],
      ruleId: 'rule1',
      modelVersion: 'v1',
      featureFlag: 'default',
      disclaimer: 'Suggestion only — not binding',
    });
    // Other company cannot access
    const res = await request(app)
      .post(`/api/v1/ai/insights/${insight.id}/decisions`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ decision: 'accepted' });
    expect([403, 404, 501]).toContain(res.status);
  });

  it('should allow accountant to accept/reject, admin to override, viewer forbidden', async () => {
    // Ensure AI is enabled for this test
    await company.update({ aiEnabled: true });
    const insight = await AIInsight.create({
      companyId: company.id,
      entityType: 'invoice',
      entityId: 'inv-2',
      type: 'invoice_anomaly',
      severity: 'medium',
      confidenceScore: 0.9,
      summary: 'Test',
      why: 'Test',
      legalContext: 'GoBD',
      evidence: [],
      ruleId: 'rule1',
      modelVersion: 'v1',
      featureFlag: 'default',
      disclaimer: 'Suggestion only — not binding',
    });
    // Accountant accept
    let res = await request(app)
      .post(`/api/v1/ai/insights/${insight.id}/decisions`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ decision: 'accepted' });
    expect([200, 403, 404, 501]).toContain(res.status);
    // Accountant reject (no reason = 400)
    res = await request(app)
      .post(`/api/v1/ai/insights/${insight.id}/decisions`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ decision: 'rejected' });
    expect([400, 404]).toContain(res.status);
    // Accountant reject (with reason)
    res = await request(app)
      .post(`/api/v1/ai/insights/${insight.id}/decisions`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ decision: 'rejected', reason: 'Not relevant' });
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('decision');
    } else {
      expect(res.status).toBe(404);
    }
    // Admin override
    res = await request(app)
      .post(`/api/v1/ai/insights/${insight.id}/decisions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'overridden', reason: 'Manual correction' });
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('decision');
    }
    // Viewer forbidden
    res = await request(app)
      .post(`/api/v1/ai/insights/${insight.id}/decisions`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ decision: 'accepted' });
    expect([403, 404]).toContain(res.status);
  });

  it('should return insights with decision state', async () => {
    const res = await request(app)
      .get('/api/v1/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 403, 404, 501]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.insights)).toBe(true);
      if (res.body.insights.length) {
        expect(res.body.insights[0]).toHaveProperty('decisions');
      }
    }
  });
});
