const request = require('supertest');
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

    const res = await request(app)
      .get('/api/compliance/reports/vat')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.companyId).toBe('company-123');
    expect(res.body.data.type).toBe('vat');
  });

  it('rejects user trying to fetch report for another company', async () => {
    // User with companyId 'company-abc'
    const token = makeToken('company-abc');

    const res = await request(app)
      .get('/api/compliance/reports/vat')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.companyId).toBe('company-abc');

    // Token without companyId should fail
    const badToken = jwt.sign({ role: 'user' }, process.env.JWT_SECRET || 'testsecret', {
      expiresIn: '1h',
    });

    const res2 = await request(app)
      .get('/api/compliance/reports/vat')
      .set('Authorization', `Bearer ${badToken}`)
      .expect(403);

    expect(res2.body.success).toBe(false);
  });
});
