import request from 'supertest';
import app from '../../src/app';

test('exports only POSTED invoices', async () => {
  const res = await request(app).get('/api/exports/datev').query({ fiscalYear: 2026 });

  expect(res.text).toContain('INV-POSTED-1');
  expect(res.text).not.toContain('INV-DRAFT-1');
});

test('does not alter VAT amounts', async () => {
  const res = await request(app).get('/api/exports/datev').query({ fiscalYear: 2026 });

  // Example: 100 net + 19 VAT
  expect(res.text).toContain('119,00');
  expect(res.text).toContain('19,00');
});

test('exports only company scoped data', async () => {
  const companyA = { id: 'COMPANY-A' };
  const res = await request(app).get('/api/exports/datev').set('X-Company-Id', companyA.id);

  expect(res.text).not.toContain('COMPANY-B-INVOICE');
});
