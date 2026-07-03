const app = require('../../src/app');
const {
  ChartAccount,
  Invoice,
  InvoiceItem,
} = require('../../src/models');
const accountingPostingService = require('../../src/services/accountingPostingService');
const testUtils = require('../utils/testHelpers');

describe('Tax Bridge readiness API', () => {
  let admin;
  let adminToken;
  let companyId;

  beforeEach(async () => {
    admin = await testUtils.createTestUser({ role: 'admin' });
    companyId = admin.companyId;
    adminToken = testUtils.createAuthToken(admin.id, companyId);

    const bank = await ChartAccount.create({
      companyId,
      code: `1200-${Date.now()}`,
      name: 'Bank',
      type: 'asset',
      normalBalance: 'debit',
      isSystem: true,
    });

    const revenue = await ChartAccount.create({
      companyId,
      code: `8400-${Date.now()}`,
      name: 'Revenue 19%',
      type: 'revenue',
      normalBalance: 'credit',
      isSystem: true,
    });

    await ChartAccount.create({
      companyId,
      code: `1576-${Date.now()}`,
      name: 'Input VAT 19%',
      type: 'tax',
      normalBalance: 'debit',
      taxCategory: 'input_vat',
      isSystem: true,
    });

    await ChartAccount.create({
      companyId,
      code: `1776-${Date.now()}`,
      name: 'Output VAT 19%',
      type: 'tax',
      normalBalance: 'credit',
      taxCategory: 'output_vat',
      isSystem: true,
    });

    const invoice = await Invoice.create({
      invoiceNumber: `TB-INV-${Date.now()}`,
      subtotal: 100,
      total: 119,
      amount: 119,
      currency: 'EUR',
      status: 'SENT',
      date: new Date('2026-02-01'),
      dueDate: new Date('2026-02-15'),
      clientName: 'Tax Bridge Client',
      userId: admin.id,
      companyId,
    });

    await InvoiceItem.create({
      invoiceId: invoice.id,
      description: 'Tax Bridge service',
      quantity: 1,
      unitPrice: 100,
      vatRate: 0.19,
      lineNet: 100,
      lineVat: 19,
      lineGross: 119,
    });

    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId,
      entryDate: '2026-02-01',
      sourceType: 'invoice',
      sourceId: String(invoice.id),
      createdBy: admin.id,
      description: 'Posted tax bridge test invoice',
      lines: [
        {
          accountId: bank.id,
          debit: 119,
          credit: 0,
          description: 'Bank debit',
        },
        {
          accountId: revenue.id,
          debit: 0,
          credit: 119,
          description: 'Revenue credit',
        },
      ],
    });

    await draft.journalEntry.update(
      {
        status: 'posted',
        postedAt: new Date(),
        postedBy: admin.id,
      },
      { allowPostedJournalEntryMutation: true },
    );
  });

  it('returns read-only Tax Bridge readiness scores and boundaries', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/tax-bridge/readiness?from=2026-01-01&to=2026-12-31',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': companyId },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.product).toBe('SmartAccounting Tax Bridge');
    expect(response.body.mode).toBe('preparation_only');
    expect(response.body.scores.overall).toBeGreaterThanOrEqual(0);
    expect(response.body.scores.overall).toBeLessThanOrEqual(100);
    expect(response.body.metrics.postedJournalEntries).toBeGreaterThan(0);
    expect(response.body.metrics.taxAccounts).toBeGreaterThanOrEqual(2);
    expect(response.body.sourceBoundaries).toEqual(
      expect.arrayContaining([
        'No DATEV API upload is performed.',
        'No ELSTER submission is performed.',
      ]),
    );
  });
});
