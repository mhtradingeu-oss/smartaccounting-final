const app = require('../../src/app');
const jwt = require('jsonwebtoken');

// Helper to create JWT for the seeded test user
function makeToken() {
  return jwt.sign(
    {
      userId: global.testUser.id,
      companyId: global.testCompany.id,
      role: global.testUser.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

describe('GET /api/compliance/reports/:type (tenant-safe)', () => {
  it('allows authorized user to fetch their company report', async () => {
    const token = makeToken();

    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/compliance/reports/vat',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toBe(global.testCompany.id);
    expect(res.body.data.type).toBe('vat');
  });

  it('rejects user trying to fetch report for another company', async () => {
    const token = makeToken();

    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/compliance/reports/vat',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.companyId).toBe(global.testCompany.id);

    // Create a token for a real user but with a different, valid companyId
    const badToken = jwt.sign(
      {
        userId: global.testUser.id, // existing user
        role: global.testUser.role,
        companyId: global.otherCompany.id, // different company
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const res2 = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/compliance/reports/vat',
      headers: { Authorization: `Bearer ${badToken}` },
    });

    expect(res2.status).toBe(403);
    expect(res2.body.success).toBe(false);
  });
});
