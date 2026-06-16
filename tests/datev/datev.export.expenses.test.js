import request from 'supertest';
import app from '../../src/app';

test('maps expense VAT to input VAT accounts', async () => {
  const res = await request(app).get('/api/exports/datev').query({ fiscalYear: 2026 });

  expect(res.text).toContain(';1576;'); // Input VAT 19%
});
