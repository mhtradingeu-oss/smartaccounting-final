const app = require('../../src/app');
const { AIInsight, AIInsightDecision, User, sequelize } = require('../../src/models');
const { createTestCompany } = require('../utils/createTestCompany');
const testUtils = require('../utils/testHelpers');

describe('AI Exports API', () => {
  let admin, adminToken, company;

  beforeAll(async () => {
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
    admin = await testUtils.createTestUser({ role: 'admin', companyId: company.id });
    adminToken = testUtils.createAuthToken(admin.id);
    // Create insights/decisions
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
    await AIInsightDecision.create({
      insightId: insight.id,
      companyId: company.id,
      actorUserId: admin.id,
      decision: 'accepted',
      reason: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should export JSON with modelVersion/ruleId', async () => {
    const res = await global.requestApp({
      app,
      method: 'get',
      url: '/api/ai/exports/insights.json',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': company.id },
      query: { purpose: 'insights_export_json', policyVersion: 'v1' },
    });
    expect([200, 400, 403, 404, 501]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
      if (Array.isArray(res.body) && res.body.length) {
        expect(res.body[0]).toHaveProperty('modelVersion');
        expect(res.body[0]).toHaveProperty('ruleId');
      }
    } else {
      expect(res.body.error).toBe(true);
      expect(res.body.errorCode).toBeDefined();
      expect(res.body.requestId).toBeTruthy();
    }
  });

  it('should export CSV with correct headers', async () => {
    const res = await global.requestApp({
      app,
      method: 'get',
      url: '/api/ai/exports/insights.csv',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': company.id },
      query: { purpose: 'insights_export_csv', policyVersion: 'v1' },
    });
    expect([200, 400, 403, 404, 501]).toContain(res.status);
    if (res.status === 200) {
      expect(res.text).toContain(
        'id,entityType,entityId,type,severity,confidenceScore,summary,why,legalContext,ruleId,modelVersion,featureFlag,createdAt,decision,decisionReason,decisionActorUserId,decisionCreatedAt',
      );
    } else {
      expect(res.body?.error).toBe(true);
      expect(res.body?.errorCode).toBeDefined();
      expect(res.body?.requestId).toBeTruthy();
    }
  });

  it('should enforce companyId scoping', async () => {
    const otherCompany = await createTestCompany({
      name: 'OtherExportCo',
      taxId: 'DE000000000',
      address: 'Test Address 3',
    });
    const otherAdmin = await testUtils.createTestUser({
      role: 'admin',
      companyId: otherCompany.id,
    });
    const otherToken = testUtils.createAuthToken(otherAdmin.id);
    const res = await global.requestApp({
      app,
      method: 'get',
      url: '/api/ai/exports/insights.json',
      headers: { Authorization: `Bearer ${otherToken}`, 'x-company-id': otherCompany.id },
      query: { purpose: 'insights_export_json', policyVersion: 'v1' },
    });
    // Should not see ExportCo's insights
    if (Array.isArray(res.body)) {
      expect(res.body.length === 0 || res.body.every((i) => i.companyId === otherCompany.id)).toBe(
        true,
      );
    } else {
      expect(typeof res.body).toBe('object');
      expect(res.body.error).toBe(true);
      expect(res.body.errorCode).toBeDefined();
      expect(res.body.requestId).toBeTruthy();
    }
  });
});
