const app = require('../../src/app');
const { createTestCompany } = require('../utils/createTestCompany');
const testUtils = require('../utils/testHelpers');

const AI_HEADERS = {
  'x-ai-purpose': 'assistant_general',
  'x-ai-policy-version': '10.0.0',
};

describe('AI Assistant Stream API', () => {
  let company;
  let admin;
  let adminToken;
  let originalEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.AI_ASSISTANT_ENABLED = 'true';

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

  it('streams chunks with requestId and done event', async () => {
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/read/assistant/stream',
      headers: { Authorization: `Bearer ${adminToken}`, ...AI_HEADERS, 'x-company-id': company.id },
      body: { intent: 'review', prompt: 'Summarize status', sessionId: 'session-test' },
    });
    expect(res.res.statusCode).toBe(200);
    expect(typeof res.body).toBe('string');
    expect(res.body).toContain('event: chunk');
    expect(res.body).toContain('event: done');
    expect(res.body).toMatch(/requestId/);
  });
});
