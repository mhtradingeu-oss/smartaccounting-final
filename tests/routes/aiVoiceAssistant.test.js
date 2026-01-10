const app = require('../../src/app');
const { createTestCompany } = require('../utils/createTestCompany');
const testUtils = require('../utils/testHelpers');
const AuditLogService = require('../../src/services/auditLogService');

const AI_HEADERS = {
  'x-ai-purpose': 'assistant_general',
  'x-ai-policy-version': '10.0.0',
};

describe('AI Voice Assistant API', () => {
  let company;
  let admin;
  let viewer;
  let adminToken;
  let viewerToken;
  let originalEnv;

  beforeAll(async () => {
    originalEnv = { ...process.env };
    process.env.AI_ASSISTANT_ENABLED = 'true';
    process.env.AI_VOICE_ENABLED = 'true';
    process.env.AI_TTS_ENABLED = 'true';

    company = await createTestCompany({ ttsEnabled: true });
    admin = await testUtils.createTestUser({ role: 'admin', companyId: company.id });
    viewer = await testUtils.createTestUser({ role: 'viewer', companyId: company.id });
    adminToken = testUtils.createAuthToken(admin.id, admin.companyId);
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should reject unauthenticated requests', async () => {
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/voice/assistant',
      headers: { ...AI_HEADERS, 'x-company-id': company.id },
      body: { intent: 'review', transcript: 'Summarize status' },
    });
    expect(res.res.statusCode).toBe(401);
  });

  it('should require purpose and policyVersion', async () => {
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/voice/assistant',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': company.id },
      body: { intent: 'review', transcript: 'Summarize status' },
    });
    expect(res.res.statusCode).toBe(400);
  });

  it('should return 501 when AI is disabled for the company', async () => {
    await company.update({ aiEnabled: false });
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/voice/assistant',
      headers: { Authorization: `Bearer ${adminToken}`, ...AI_HEADERS, 'x-company-id': company.id },
      body: { intent: 'review', transcript: 'Summarize status' },
    });
    await company.update({ aiEnabled: true });
    expect(res.res.statusCode).toBe(501);
  });

  it('should forbid viewer roles', async () => {
    const appendSpy = jest.spyOn(AuditLogService, 'appendEntry').mockResolvedValue({});
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/voice/assistant',
      headers: { Authorization: `Bearer ${viewerToken}`, ...AI_HEADERS, 'x-company-id': company.id },
      body: { intent: 'review', transcript: 'Summarize status' },
    });
    expect(res.res.statusCode).toBe(403);
    const rejectedCall = appendSpy.mock.calls.find(
      ([payload]) => payload?.action === 'AI_QUERY_REJECTED',
    );
    expect(rejectedCall).toBeTruthy();
  });

  it('should return 403 when voice feature is disabled', async () => {
    process.env.AI_VOICE_ENABLED = 'false';
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/voice/assistant',
      headers: { Authorization: `Bearer ${adminToken}`, ...AI_HEADERS, 'x-company-id': company.id },
      body: { intent: 'review', transcript: 'Summarize status' },
    });
    process.env.AI_VOICE_ENABLED = 'true';
    expect(res.res.statusCode).toBe(403);
  });

  it('should audit voice responseMode with requestId and actor context', async () => {
    const appendSpy = jest.spyOn(AuditLogService, 'appendEntry').mockResolvedValue({});
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/voice/assistant',
      headers: { Authorization: `Bearer ${adminToken}`, ...AI_HEADERS, 'x-company-id': company.id },
      body: {
        intent: 'review',
        transcript: 'Summarize status',
        responseMode: 'voice',
        sessionId: 'session-test',
      },
    });
    expect(res.res.statusCode).toBe(200);
    const respondedCall = appendSpy.mock.calls.find(
      ([payload]) =>
        payload?.action === 'AI_QUERY_RESPONDED' && payload?.newValues?.responseMode === 'voice',
    );
    expect(respondedCall).toBeTruthy();
    expect(respondedCall[0].userId).toBe(admin.id);
    expect(respondedCall[0].companyId).toBe(company.id);
    expect(respondedCall[0].newValues.requestId).toBeTruthy();
  });
});
