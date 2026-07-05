const app = require('../../src/app');

describe('AI Approval Queue read-only API', () => {
  it('returns a safe non-persisted empty approval queue for viewer role', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/ai/approval-queue',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      persisted: false,
      items: [],
      message: 'AI approval queue persistence is not enabled yet.',
      meta: {
        companyId: user.companyId,
        readOnly: true,
        executionEnabled: false,
        approvalDecisionsEnabled: false,
      },
    });
  });

  it('keeps approval queue scoped to the authenticated company context', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/ai/approval-queue',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.meta.companyId).toBe(user.companyId);
    expect(response.body.items).toEqual([]);
  });

  it('does not expose approval decision or execution endpoints', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/approve',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
      body: {
        approvalId: 'approval_test',
      },
    });

    expect([404, 405]).toContain(response.status);
  });
});
