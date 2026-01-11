const app = require('../../src/app');
const { createTestCompany } = require('../utils/createTestCompany');
const testUtils = require('../utils/testHelpers');

const AI_HEADERS = {
  'x-ai-purpose': 'assistant_general',
  'x-ai-policy-version': '10.0.0',
};

describe('AI Suggestions API', () => {
  let company;
  let admin;
  let adminToken;
  let originalEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.AI_SUGGESTIONS_ENABLED = 'false';

    company = await createTestCompany();
    admin = await testUtils.createTestUser({ role: 'admin', companyId: company.id });
    adminToken = testUtils.createAuthToken(admin.id, admin.companyId);
  });

  afterAll(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  it('returns 501 when AI suggestions are disabled', async () => {
    const res = await global.requestApp({
      app,
      method: 'get',
      url: '/api/ai/suggest',
      headers: { Authorization: `Bearer ${adminToken}`, ...AI_HEADERS, 'x-company-id': company.id },
      query: { prompt: 'Suggest actions' },
    });
    expect(res.res.statusCode).toBe(501);
    expect(res.body).toMatchObject({
      errorCode: 'AI_SUGGEST_NOT_READY',
      message: 'AI suggestions are not production-ready',
    });
    expect(res.body.requestId).toBeTruthy();
  });
});
