const app = require('../../src/app');
const { Invoice, InvoiceItem, Expense, FileAttachment, Company } = require('../../src/models');
const testUtils = require('../utils/testHelpers');

describe('DATEV export preparation', () => {
  let admin;
  let adminToken;
  let invoice;
  let expense;
  let invoiceAttachment;
  let expenseAttachment;
  let companyId;

  beforeAll(async () => {
    admin = await testUtils.createTestUser({ role: 'admin' });
    companyId = admin.companyId;
    adminToken = testUtils.createAuthToken(admin.id, companyId);

    invoice = await Invoice.create({
      invoiceNumber: `INV-DATEV-${Date.now()}`,
      subtotal: 100.0,
      total: 119.0,
      amount: 119.0,
      currency: 'EUR',
      status: 'SENT',
      date: new Date('2025-01-15'),
      dueDate: new Date('2025-02-14'),
      clientName: 'DATEV Client',
      userId: admin.id,
      companyId,
    });

    await InvoiceItem.create({
      invoiceId: invoice.id,
      description: 'Consulting',
      quantity: 1,
      unitPrice: 100.0,
      vatRate: 0.19,
      lineNet: 100.0,
      lineVat: 19.0,
      lineGross: 119.0,
    });

    expense = await Expense.create({
      description: 'Hosting expense',
      companyId,
      userId: admin.id,
      createdByUserId: admin.id,
      vendorName: 'Hosting Vendor',
      date: new Date('2025-01-20'),
      expenseDate: new Date('2025-01-20'),
      category: 'software',
      netAmount: 50.0,
      vatRate: 0.19,
      vatAmount: 9.5,
      grossAmount: 59.5,
      amount: 59.5,
      currency: 'EUR',
      status: 'draft',
      source: 'manual',
    });

    invoiceAttachment = await FileAttachment.create({
      fileName: 'invoice-datev.pdf',
      originalName: 'invoice-datev.pdf',
      filePath: '/tmp/invoice-datev.pdf',
      fileSize: 1200,
      mimeType: 'application/pdf',
      documentType: 'invoice',
      userId: admin.id,
      companyId,
      uploadedBy: admin.id,
      invoiceId: invoice.id,
    });

    expenseAttachment = await FileAttachment.create({
      fileName: 'expense-datev.pdf',
      originalName: 'expense-datev.pdf',
      filePath: '/tmp/expense-datev.pdf',
      fileSize: 900,
      mimeType: 'application/pdf',
      documentType: 'expense',
      userId: admin.id,
      companyId,
      uploadedBy: admin.id,
      expenseId: expense.id,
    });
  });

  afterAll(async () => {
    if (invoiceAttachment) {
      await invoiceAttachment.destroy({ force: true });
    }
    if (expenseAttachment) {
      await expenseAttachment.destroy({ force: true });
    }
    if (invoice) {
      await invoice.destroy({ force: true });
    }
    if (expense) {
      await expense.destroy({ force: true });
    }
    if (admin) {
      await admin.destroy({ force: true });
    }
    if (companyId) {
      await Company.destroy({ where: { id: companyId }, force: true });
    }
  });

  it('exports DATEV CSV with disclaimer header and records', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/exports/datev?format=csv&kontenrahmen=skr03&from=2025-01-01&to=2025-01-31',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.res.getHeader('X-Export-Disclaimer')).toMatch(/DATEV-compatible export/i);
    expect(typeof response.body).toBe('string');
    expect(response.body).toContain(
      'recordType,recordId,bookingDate,account,counterAccount,amount,vatAmount,currency,taxKey,bookingText,attachmentPaths',
    );
    expect(response.body).toContain('invoice');
    expect(response.body).toContain('expense');
  });
});
