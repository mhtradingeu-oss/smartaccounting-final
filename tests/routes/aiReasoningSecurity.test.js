jest.mock(
  '../../src/services/ai/reasoning/aiReasoningEngine',
  () => ({
    explainEntity: jest.fn().mockReturnValue({
      success: true,
      explanation: {
        entity: 'mock',
        reasoning: [],
      },
    }),
    explainChain: jest.fn().mockReturnValue({
      success: true,
      totalNodes: 0,
      totalEdges: 0,
    }),
  }),
);

const request = require('supertest');
const app = require('../../src/app');

const testUtils = require('../utils/testHelpers');

describe('AI reasoning route security', () => {
  let company;
  let otherCompany;
  let sessions;

  beforeEach(async () => {
    await testUtils.cleanDatabase();

    company = await testUtils.createTestCompany();
    otherCompany = await testUtils.createTestCompany();

    sessions = {};

    for (const role of ['admin', 'accountant', 'auditor', 'viewer']) {
      sessions[role] =
        await testUtils.createTestUserAndLogin({
          role,
          companyId: company.id,
        });

      console.log(
        'CREATED_ROLE',
        role,
        sessions[role].user.role
      );
    }
  });

  afterAll(async () => {
    await testUtils.cleanDatabase();
  });

  it('rejects unauthenticated AI reasoning access', async () => {
    const response = await request(app)
      .get('/api/ai/reasoning/chain');

    expect(response.status).toBe(401);
  });

  it('requires company context', async () => {
    const response = await request(app)
      .get('/api/ai/reasoning/chain')
      .set(
        'Authorization',
        `Bearer ${sessions.admin.token}`,
      );

    expect(response.status).toBe(400);
  });

  it('rejects invalid company context', async () => {
    const response = await request(app)
      .get('/api/ai/reasoning/chain')
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


  it('rejects viewer AI reasoning access', async () => {
    const response = await request(app)
      .get('/api/ai/reasoning/chain')
      .set(
        'Authorization',
        `Bearer ${sessions.viewer.token}`,
      )
      .set(
        'x-company-id',
        String(company.id),
      );

    expect(response.status).toBe(403);
  });

  it.each([
    'admin',
    'accountant',
    'auditor',
  ])(
    'allows %s same-company AI reasoning read',
    async (role) => {
      let response;

      try {
        response = await request(app)
          .get('/api/ai/reasoning/chain')
          .set(
            'Authorization',
            `Bearer ${sessions[role].token}`,
          )
          .set(
            'x-company-id',
            String(company.id),
          );

        console.log(
          'AI_DEBUG_ROLE=' + role,
          'STATUS=' + response.status,
          JSON.stringify(response.body),
        );

      } catch (error) {
        console.log(
          'AI_REQUEST_EXCEPTION=' + role,
          error.message,
        );
        throw error;
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    },
  );
});
