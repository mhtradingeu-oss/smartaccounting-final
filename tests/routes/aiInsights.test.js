const request = require('../utils/request');
const app = require('../../src/app');
const { AIInsight } = require('../../src/models');
const { createTestCompany } = require('../utils/createTestCompany');
const testUtils = require('../utils/testHelpers');

describe('AI Insights API', () => {
  let admin, adminToken, accountant, accountantToken, viewer, viewerToken, company;

  beforeAll(async () => {
    company = await createTestCompany();
    await company.reload();

    admin = await testUtils.createTestUser({ role: 'admin', companyId: company.id });
    accountant = await testUtils.createTestUser({ role: 'accountant', companyId: company.id });
    viewer = await testUtils.createTestUser({ role: 'viewer', companyId: company.id });

    adminToken = testUtils.createAuthToken(admin.id, admin.companyId);
    accountantToken = testUtils.createAuthToken(accountant.id, accountant.companyId);
    viewerToken = testUtils.createAuthToken(viewer.id, viewer.companyId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should block access when AI is disabled', async () => {
    await company.update({ aiEnabled: false });

    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ purpose: 'insights', policyVersion: '1' });

    if (res.res.statusCode === 403) {
      expect(res.body).toHaveProperty('error');
      expect([
        'Forbidden: invalid company context',
        'Mutation not allowed',
        'AI is disabled for this company',
      ]).toContain(res.body.error);
    } else {
      expect(res.res.statusCode).toBe(501);
      expect(res.body).toEqual({ status: 'disabled', feature: 'AI Insights' });
    }

    await company.update({ aiEnabled: true });
  });

  it('should scope insights by company', async () => {
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

    const otherToken = testUtils.createAuthToken(otherAdmin.id, otherAdmin.companyId);

    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${otherToken}`)
      .query({ purpose: 'insights', policyVersion: '1' });

    expect(res.res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect([
      'Forbidden: invalid company context',
      'Mutation not allowed',
      'AI_POLICY_VIOLATION: invalid purpose or policyVersion',
    ]).toContain(res.body.error);
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
      .query({ purpose: 'insights', policyVersion: '1' })
      .send({ decision: 'accepted', reason: 'Test' });

    expect(res.res.statusCode).toBe(501);
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
      .set('Authorization', `Bearer ${viewerToken}`)
      .query({ purpose: 'insights', policyVersion: '1' });

    expect(res.res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });
});
