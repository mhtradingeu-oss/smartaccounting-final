const request = require('supertest');
const app = require('../../src/app');

const testUtils = require('../utils/testHelpers');

describe('Enterprise observability route security', () => {
  let company;
  let otherCompany;
  let sessions;

  beforeEach(async () => {
    await testUtils.cleanDatabase();

    company = await testUtils.createTestCompany();
    otherCompany = await testUtils.createTestCompany();

    sessions = {};

    for (const role of [
      'admin',
      'accountant',
      'auditor',
      'viewer',
    ]) {
      sessions[role] =
        await testUtils.createTestUserAndLogin({
          role,
          companyId: company.id,
        });
    }
  });

  afterAll(async () => {
    await testUtils.cleanDatabase();
  });

  it('rejects unauthenticated observability access', async () => {
    const response = await request(app)
      .get('/api/enterprise/observability/health');

    expect(response.status).toBe(401);
  });

  it('requires company context', async () => {
    const response = await request(app)
      .get('/api/enterprise/observability/health')
      .set(
        'Authorization',
        `Bearer ${sessions.admin.token}`,
      );

    expect(response.status).toBe(400);
  });

  it('rejects invalid company context', async () => {
    const response = await request(app)
      .get('/api/enterprise/observability/health')
      .set(
        'Authorization',
        `Bearer ${sessions.admin.token}`,
      )
      .set(
        'x-company-id',
        String(otherCompany.id),
      );

    expect(response.status).toBe(403);
  });

  it.each([
    'admin',
    'auditor',
  ])(
    'allows %s same-company observability read',
    async (role) => {
      const response = await request(app)
        .get('/api/enterprise/observability/health')
        .set(
          'Authorization',
          `Bearer ${sessions[role].token}`,
        )
        .set(
          'x-company-id',
          String(company.id),
        );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    },
  );

  it.each([
    'accountant',
    'viewer',
  ])(
    'rejects %s observability access',
    async (role) => {
      const response = await request(app)
        .get('/api/enterprise/observability/health')
        .set(
          'Authorization',
          `Bearer ${sessions[role].token}`,
        )
        .set(
          'x-company-id',
          String(company.id),
        );

      expect(response.status).toBe(403);
    },
  );
});
