// Test for VAT UStVA preparation API endpoint
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

  it('should return VAT aggregation, cross-check, exports, and preparation-only boundaries', async () => {
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
    expect(res.headers['x-export-disclaimer']).toContain('UStVA preparation only');
    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('preparation_only');
    expect(res.body.product).toBe('SmartAccounting Tax Bridge');
    expect(res.body).toHaveProperty('vatData');
    expect(res.body).toHaveProperty('crossCheck');
    expect(res.body).toHaveProperty('csv');
    expect(res.body).toHaveProperty('json');
    expect(res.body.crossCheck.passed).toBe(true);
    expect(res.body.sourceBoundaries).toEqual(
      expect.arrayContaining([
        'UStVA preparation data only.',
        'No ELSTER submission is performed.',
        'No transmission to Finanzamt is performed.',
        'Review with a qualified Steuerberater before filing.',
      ]),
    );
  });

  it('should reject missing companyId with a clean preparation-only validation error', async () => {
    const res = await request(app)
      .post('/api/vat/ustva')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', '')
      .send({
        periodFrom: '2026-01-01',
        periodTo: '2026-01-31',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.mode).toBe('preparation_only');
    expect(res.body.error).toEqual({
      code: 'VAT_USTVA_COMPANY_REQUIRED',
      message: 'A valid companyId is required to prepare UStVA data.',
    });
    expect(JSON.stringify(res.body)).not.toContain('WHERE parameter');
  });

  it('should reject missing period with a clean preparation-only validation error', async () => {
    const res = await request(app)
      .post('/api/vat/ustva')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', testUser.companyId)
      .send({
        companyId: testUser.companyId,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.mode).toBe('preparation_only');
    expect(res.body.error).toEqual({
      code: 'VAT_USTVA_PERIOD_REQUIRED',
      message: 'Valid periodFrom and periodTo dates are required in YYYY-MM-DD format.',
    });
  });
});
