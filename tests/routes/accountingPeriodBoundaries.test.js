const app = require('../../src/app');
const buildSystemContext = require('../utils/buildSystemContext');
const { buildInvoicePayload } = require('../utils/buildPayload');

const getAuthHeader = () => ({
  Authorization: `Bearer ${global.testToken}`,
  'x-company-id': global.testCompany?.id,
});

describe('Accounting period boundaries – status immutability', () => {
  test('returns 409 when editing an invoice after finalization', async () => {
    const invoicePayload = buildInvoicePayload({
      status: 'DRAFT',
      items: [{ description: 'Audit-ready service', quantity: 1, unitPrice: 100, vatRate: 0.19 }],
      userId: global.testUser.id,
      companyId: global.testCompany.id,
    });

    const createRes = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/invoices',
      headers: getAuthHeader(),
      body: {
        ...invoicePayload,
        systemContext: buildSystemContext({ user: global.testUser, reason: 'Create invariant invoice' }),
      },
    });
    expect(createRes.status).toBe(201);
    const invoiceId =
      createRes.body.invoice?.id ?? createRes.body.data?.invoice?.id ?? createRes.body?.id;
    expect(invoiceId).toBeDefined();

    const statusRes = await global.requestApp({
      app,
      method: 'PATCH',
      url: `/api/invoices/${invoiceId}/status`,
      headers: getAuthHeader(),
      body: { status: 'sent' },
    });
    expect(statusRes.status).toBe(200);

    const updateRes = await global.requestApp({
      app,
      method: 'PUT',
      url: `/api/invoices/${invoiceId}`,
      headers: getAuthHeader(),
      body: {
        notes: 'Attempted edit after closing',
        systemContext: buildSystemContext({ user: global.testUser, reason: 'Enforce immutability' }),
      },
    });
    expect(updateRes.status).toBe(409);
    expect(updateRes.body.message).toMatch(/immutable/i);
  });
});

describe('Enterprise fiscal period locks (Enterprise-tier feature, not MVP)', () => {
  test.skip('should reject invoice edits once the fiscal year is closed', () => {
    // TODO: implement enterprise period lock guard that returns 403/409 when the fiscal year
    // is marked as closed for a company. Period locking is an enterprise feature and not required for v1.
  });

  test.skip('should reject deletion of accounting entries after a locked period', () => {
    // TODO: enforce period lock on all delete paths (transactions, invoices, expenses) so the backend
    // returns 403/409 instead of allowing removals. This remains an enterprise-level safeguard.
  });
});
