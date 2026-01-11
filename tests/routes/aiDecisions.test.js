const app = require("../../src/app");
const testUtils = require("../utils/testHelpers");
const { AIInsight } = require("../../src/models");

describe("POST /api/ai/insights/:id/decisions (read-only)", () => {
  let adminToken;
  let viewerToken;
  let insight;

  beforeAll(async () => {
    const company = await testUtils.createTestCompany();
    const admin = await testUtils.createTestUser({ role: "admin", companyId: company.id });
    const viewer = await testUtils.createTestUser({ role: "viewer", companyId: company.id });

    adminToken = testUtils.createAuthToken(admin.id, admin.companyId);
    viewerToken = testUtils.createAuthToken(viewer.id, viewer.companyId);

    insight = await AIInsight.create({
      companyId: company.id,
      entityType: "invoice",
      entityId: "ai-insight-readonly",
      type: "invoice_anomaly",
      severity: "medium",
      confidenceScore: 0.65,
      summary: "Read-only decision test",
      why: "Testing read-only guard",
      legalContext: "GoBD",
      evidence: [],
      ruleId: "rule-ai-decision",
      modelVersion: "v1",
      featureFlag: "default",
      disclaimer: "Advisory only",
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    const res = await global.requestApp({
      app,
      method: "post",
      url: `/api/ai/insights/${insight.id}/decisions`,
      headers: { "x-company-id": insight.companyId },
    });
    expect(res.status).toBe(401);
  });

  it("forbids insufficient roles before hitting the read-only guard", async () => {
    const res = await global.requestApp({
      app,
      method: "post",
      url: `/api/ai/insights/${insight.id}/decisions`,
      headers: { Authorization: `Bearer ${viewerToken}`, "x-company-id": insight.companyId },
      body: { decision: "accepted", reason: "not used" },
    });
    expect(res.status).toBe(403);
  });

  it("returns the read-only response for permitted roles", async () => {
    const res = await global.requestApp({
      app,
      method: "post",
      url: `/api/ai/insights/${insight.id}/decisions`,
      headers: { Authorization: `Bearer ${adminToken}`, "x-company-id": insight.companyId },
      body: { decision: "accepted", reason: "test" },
    });
    expect(res.status).toBe(501);
    expect(res.body.error).toBe(true);
    expect(res.body.errorCode).toBe("AI_MUTATION_DISABLED");
    expect(res.body.message).toBe("AI decision capture is disabled");
    expect(typeof res.body.requestId).toBe("string");
  });
});
