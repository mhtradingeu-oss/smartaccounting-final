// Test for VAT UStVA API endpoint
const request = require('supertest');
const app = require('../src/app');

describe('POST /api/vat/ustva', () => {
  it('should return VAT aggregation, cross-check, and exports', async () => {
    const res = await request(app)
      .post('/api/vat/ustva')
      .send({
        companyId: 1,
        periodFrom: '2026-01-01',
        periodTo: '2026-01-31',
        journalTotals: {
          outputVAT: { 19: 100, 7: 50, reverseCharge: 0, eu: 0 },
          inputVAT: { 19: 20, 7: 10, reverseCharge: 0, eu: 0 },
        },
        datevTotals: {
          outputVAT: { 19: 100, 7: 50, reverseCharge: 0, eu: 0 },
          inputVAT: { 19: 20, 7: 10, reverseCharge: 0, eu: 0 },
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
