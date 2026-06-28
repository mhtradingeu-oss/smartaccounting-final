import request from 'supertest';
import app from '../../src/app';
import { Expense } from '../../src/models';

let authToken;
let testUser;

beforeEach(async () => {
  const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
  testUser = result.user;
  authToken = result.token;

  await Expense.create({
    description: 'DATEV VAT expense',
    companyId: testUser.companyId,
    userId: testUser.id,
    createdByUserId: testUser.id,
    vendorName: 'DATEV Expense Vendor',
    date: new Date('2026-01-20'),
    expenseDate: new Date('2026-01-20'),
    category: 'office',
    netAmount: 100.0,
    vatRate: 0.19,
    vatAmount: 19.0,
    grossAmount: 119.0,
    amount: 119.0,
    currency: 'EUR',
    status: 'booked',
    source: 'manual',
  });
});

test('exports expense VAT without altering amounts', async () => {
  const res = await request(app)
    .get('/api/exports/datev')
    .set('Authorization', `Bearer ${authToken}`)
    .set('x-company-id', testUser.companyId)
    .query({ fiscalYear: 2026 });

  expect(res.status).toBe(200);
  expect(res.text).toContain('expense');
  expect(res.text).toContain('DATEV Expense Vendor');
  expect(res.text).toContain('100.00');
  expect(res.text).toContain('19.00');
});
