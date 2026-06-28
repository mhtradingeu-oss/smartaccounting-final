// Test for VAT UStVA API endpoint
const request = require('supertest');
const app = require('../src/app');

describe('POST /api/vat/ustva', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;
  });

  it('should return VAT aggregation, cross-check, and exports', async () => {
    const res = await request(app)
      .post('/api/vat/ustva')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', testUser.companyId)
      .send({
        companyId: testUser.companyId,
        periodFrom: '2026-01-01',
        periodTo: '2026-01-31',
        journalTotals: {
          outputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
          inputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
        },
        datevTotals: {
          outputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
          inputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
        },
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('vatData');
    expect(res.body).toHaveProperty('crossCheck');
    expect(res.body).toHaveProperty('csv');
    expect(res.body).toHaveProperty('json');
    expect(res.body.crossCheck.passed).toBe(true);
  });
});
