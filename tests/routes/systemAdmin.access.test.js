// Minimal backend RBAC test for /api/system/companies (should 403 for non-system_admin)
const request = require('supertest');
const app = require('../src/app');

describe('System Admin RBAC', () => {
  it('should 403 for non-system_admin on GET /api/system/companies', async () => {
    // Simulate a non-admin user (mock or use a test helper)
    const token = await getTestUserToken({ role: 'accountant', companyId: 1 });
    const res = await request(app)
      .get('/api/system/companies')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message || res.body.error).toMatch(/system admin/i);
  });
});

// Helper: getTestUserToken (mock or import from test utils)
async function getTestUserToken(user) {
  // This should return a valid JWT for the given user role
  // Replace with your actual test helper logic
  return 'mocked.jwt.token';
}
