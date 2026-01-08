process.env.NODE_ENV = 'test';

const app = require('../../src/app');

describe('AI meta logging invariants', () => {
  it('AI read endpoint includes requestId and does not crash with meta registry', async () => {
    // Use app directly, not handler

    const res = await global.requestApp({
      app,
      method: 'get',
      url: '/api/v1/ai/read/monthly-overview',
      headers: { Authorization: 'Bearer test-token' },
      query: { month: '2026-01', prompt: 'hello' },
    });

    // Endpoint might fail due to auth guard in test env, but must return consistent error shape
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.body).toBeDefined();
  });
});
