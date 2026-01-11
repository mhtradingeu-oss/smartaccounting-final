const app = require("../../src/app");
const { Company } = require("../../src/models");
const testUtils = require("../utils/testHelpers");

describe("Plan + company guard interaction for exports", () => {
  let company;
  let auditor;
  let auditorToken;

  beforeEach(async () => {
    company = await testUtils.createTestCompany({
      subscriptionStatus: "demo",
      subscriptionPlan: "basic",
    });
    auditor = await testUtils.createTestUser({ role: "auditor", companyId: company.id });
    auditorToken = testUtils.createAuthToken(auditor.id, company.id);
  });

  afterEach(async () => {
    if (auditor) {
      await auditor.destroy({ force: true });
    }
    if (company) {
      await Company.destroy({ where: { id: company.id }, force: true });
    }
  });

  it("blocks exports for demo subscriptions even with valid company context", async () => {
    const res = await global.requestApp({
      app,
      method: "GET",
      url: "/api/exports/audit-logs?format=json",
      headers: { Authorization: `Bearer ${auditorToken}`, "x-company-id": company.id },
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe(true);
    expect(res.body.errorCode).toBe("FORBIDDEN");
    expect(res.body.requestId).toBeTruthy();
    expect(res.body.details?.code).toBe("PLAN_RESTRICTED");
  });
});
