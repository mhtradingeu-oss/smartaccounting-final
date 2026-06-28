import request from 'supertest';
import app from '../../src/app';
import { Invoice, InvoiceItem } from '../../src/models';

let authToken;
let testUser;
let postedInvoiceNumber;
let draftInvoiceNumber;

const getDatevExport = () =>
  request(app)
    .get('/api/exports/datev')
    .set('Authorization', `Bearer ${authToken}`)
    .set('x-company-id', testUser.companyId)
    .query({ fiscalYear: 2026 });

beforeEach(async () => {
  const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
  testUser = result.user;
  authToken = result.token;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  postedInvoiceNumber = `INV-POSTED-1-${suffix}`;
  draftInvoiceNumber = `INV-DRAFT-1-${suffix}`;

  const postedInvoice = await Invoice.create({
    invoiceNumber: postedInvoiceNumber,
    subtotal: 100.0,
    total: 119.0,
    amount: 119.0,
    currency: 'EUR',
    status: 'SENT',
    date: new Date('2026-01-15'),
    dueDate: new Date('2026-02-14'),
    clientName: 'DATEV Posted Client',
    userId: testUser.id,
    companyId: testUser.companyId,
  });

  await InvoiceItem.create({
    invoiceId: postedInvoice.id,
    description: 'DATEV taxable service',
    quantity: 1,
    unitPrice: 100.0,
    vatRate: 0.19,
    lineNet: 100.0,
    lineVat: 19.0,
    lineGross: 119.0,
  });

  const draftInvoice = await Invoice.create({
    invoiceNumber: draftInvoiceNumber,
    subtotal: 100.0,
    total: 119.0,
    amount: 119.0,
    currency: 'EUR',
    status: 'DRAFT',
    date: new Date('2026-01-16'),
    dueDate: new Date('2026-02-15'),
    clientName: 'DATEV Draft Client',
    userId: testUser.id,
    companyId: testUser.companyId,
  });

  await InvoiceItem.create({
    invoiceId: draftInvoice.id,
    description: 'Draft service',
    quantity: 1,
    unitPrice: 100.0,
    vatRate: 0.19,
    lineNet: 100.0,
    lineVat: 19.0,
    lineGross: 119.0,
  });
});

test('exports only finalized invoices', async () => {
  const res = await getDatevExport();

  expect(res.status).toBe(200);
  expect(res.text).toContain(postedInvoiceNumber);
  expect(res.text).not.toContain(draftInvoiceNumber);
});

test('does not alter VAT amounts', async () => {
  const res = await getDatevExport();

  expect(res.status).toBe(200);
  expect(res.text).toContain('100.00');
  expect(res.text).toContain('19.00');
});

test('exports only company scoped data', async () => {
  const otherUser = await global.testUtils.createTestUser({ role: 'admin' });
  const otherInvoiceNumber = `COMPANY-B-INVOICE-${Date.now()}`;

  await Invoice.create({
    invoiceNumber: otherInvoiceNumber,
    subtotal: 100.0,
    total: 119.0,
    amount: 119.0,
    currency: 'EUR',
    status: 'SENT',
    date: new Date('2026-01-17'),
    dueDate: new Date('2026-02-16'),
    clientName: 'Other Company Client',
    userId: otherUser.id,
    companyId: otherUser.companyId,
  });

  const res = await getDatevExport();

  expect(res.status).toBe(200);
  expect(res.text).not.toContain(otherInvoiceNumber);
});
