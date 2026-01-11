const app = require('../../src/app');
const { createTestCompany } = require('../utils/createTestCompany');
const testUtils = require('../utils/testHelpers');

const AI_HEADERS = {
  'x-ai-purpose': 'assistant_general',
  'x-ai-policy-version': '10.0.0',
};

describe('AI Text Assistant API', () => {
  let company;
  let admin;
  let accountant;
  let auditor;
  let viewer;
  let adminToken;
  let accountantToken;
  let auditorToken;
  let viewerToken;
  let originalEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.AI_ASSISTANT_ENABLED = 'true';

    company = await createTestCompany();
    admin = await testUtils.createTestUser({ role: 'admin', companyId: company.id });
    accountant = await testUtils.createTestUser({ role: 'accountant', companyId: company.id });
    auditor = await testUtils.createTestUser({ role: 'auditor', companyId: company.id });
    viewer = await testUtils.createTestUser({ role: 'viewer', companyId: company.id });

    adminToken = testUtils.createAuthToken(admin.id, admin.companyId);
    accountantToken = testUtils.createAuthToken(accountant.id, accountant.companyId);
    auditorToken = testUtils.createAuthToken(auditor.id, auditor.companyId);
    viewerToken = testUtils.createAuthToken(viewer.id, viewer.companyId);
  });

  afterAll(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  it('should forbid viewer and auditor roles', async () => {
    const baseHeaders = { ...AI_HEADERS, 'x-company-id': company.id };
    const viewerRes = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/read/assistant',
      headers: { Authorization: `Bearer ${viewerToken}`, ...baseHeaders },
      body: { intent: 'review', prompt: 'Summarize status', sessionId: 'session-test' },
    });
    expect(viewerRes.res.statusCode).toBe(403);
    expect(viewerRes.body).toMatchObject({
      errorCode: 'AI_ASSISTANT_FORBIDDEN',
      message: 'Insufficient role for AI assistant',
    });
    expect(viewerRes.body.requestId).toBeTruthy();

    const auditorRes = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/read/assistant',
      headers: { Authorization: `Bearer ${auditorToken}`, ...baseHeaders },
      body: { intent: 'review', prompt: 'Summarize status', sessionId: 'session-test' },
    });
    expect(auditorRes.res.statusCode).toBe(403);
    expect(auditorRes.body).toMatchObject({
      errorCode: 'AI_ASSISTANT_FORBIDDEN',
      message: 'Insufficient role for AI assistant',
    });
    expect(auditorRes.body.requestId).toBeTruthy();
  });

  it('returns structured errors for wrong method', async () => {
    const res = await global.requestApp({
      app,
      method: 'get',
      url: '/api/ai/read/assistant',
      headers: { Authorization: `Bearer ${adminToken}`, ...AI_HEADERS, 'x-company-id': company.id },
    });
    expect(res.res.statusCode).toBe(405);
    expect(res.body).toMatchObject({
      errorCode: 'METHOD_NOT_ALLOWED',
      message: 'POST is required for AI assistant requests',
    });
    expect(res.body.requestId).toBeTruthy();
  });

  it('should allow admin and accountant roles', async () => {
    const baseHeaders = { ...AI_HEADERS, 'x-company-id': company.id };
    const adminRes = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/read/assistant',
      headers: { Authorization: `Bearer ${adminToken}`, ...baseHeaders },
      body: { intent: 'review', prompt: 'Summarize status', sessionId: 'session-test' },
    });
    expect(adminRes.res.statusCode).toBe(200);
    expect(adminRes.body.requestId).toBeTruthy();

    const accountantRes = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/read/assistant',
      headers: { Authorization: `Bearer ${accountantToken}`, ...baseHeaders },
      body: { intent: 'review', prompt: 'Summarize status', sessionId: 'session-test' },
    });
    expect(accountantRes.res.statusCode).toBe(200);
    expect(accountantRes.body.requestId).toBeTruthy();
  });
});
