const app = require('../../src/app');
const jwt = require('jsonwebtoken');

// Helper to create JWT for a given companyId
function makeToken(companyId) {
  return jwt.sign({ companyId, role: 'user' }, process.env.JWT_SECRET || 'testsecret', {
    expiresIn: '1h',
  });
}

describe('GET /api/compliance/reports/:type (tenant-safe)', () => {
  it('allows authorized user to fetch their company report', async () => {
    const token = makeToken('company-123');

    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/compliance/reports/vat',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toBe('company-123');
    expect(res.body.data.type).toBe('vat');
  });

  it('rejects user trying to fetch report for another company', async () => {
    const token = makeToken('company-abc');

    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/compliance/reports/vat',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.companyId).toBe('company-abc');

    const badToken = jwt.sign({ role: 'user' }, process.env.JWT_SECRET || 'testsecret', {
      expiresIn: '1h',
    });

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
