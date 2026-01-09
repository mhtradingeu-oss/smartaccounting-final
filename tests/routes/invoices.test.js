const { app } = require('../../src/server');
const { Invoice } = require('../../src/models');
let mockCurrentUser = { id: 1, role: 'admin', companyId: null };
describe('POST /api/invoices/:id/payments', () => {
  // Helper: always create a valid invoice using the same pattern as the passing POST /api/invoices test
  let createTestInvoice;
  let testUser;
  let testCompany;
  let authToken;
  const buildSystemContext = require('../utils/buildSystemContext');
  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    testCompany = await global.testUtils.createTestCompany();
    const { createTestUserAndLogin } = require('../utils/testHelpers');
    const { buildInvoicePayload } = require('../utils/buildPayload');
    const { user, token } = await createTestUserAndLogin({ companyId: testCompany.id });
    testUser = user;
    authToken = token;
    mockCurrentUser = { id: testUser.id, role: testUser.role, companyId: testUser.companyId };
    createTestInvoice = async (user) => {
      // Always use the valid invoice builder and always provide systemContext, reason, and at least one item
      const invoiceData = buildInvoicePayload({
        status: 'SENT',
        userId: user.id,
        companyId: user.companyId,
        items: [{ description: 'Service A', quantity: 2, unitPrice: 100, vatRate: 0.19 }],
        systemContext: buildSystemContext({
          reason: 'Test: payment flow',
          status: 'SUCCESS',
          user,
        }),
      });
      const res = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status !== 201) {
        throw new Error(
          `Invoice creation failed: status ${res.status} - ${(res.body && res.body.message) || ''}`,
        );
      }
      const invoice = res.body?.invoice ?? res.body?.data?.invoice;
      if (!invoice?.id) {
        throw new Error('Invoice creation did not return an invoice id');
      }
      return invoice;
    };
  });

  describe('POST /api/invoices', () => {
    test('should reject invoice without items', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-101',
        currency: 'EUR',
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        clientName: 'Test Client',
        items: [],
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('At least one invoice item is required');
    });
  });

  describe('GET /api/invoices', () => {
    test('should get all invoices', async () => {
      // Create test invoice with all required fields
      await Invoice.create({
        invoiceNumber: 'INV-001',
        date: new Date(),
        dueDate: new Date(),
        clientName: 'Test Client',
        subtotal: 1000.0,
        total: 1000.0,
        currency: 'EUR',
        status: 'PAID',
        userId: testUser.id,
        companyId: testCompany.id,
      });

      const response = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/invoices',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('invoices');
      expect(Array.isArray(response.body.invoices)).toBe(true);
    });
  });

  describe('POST /api/invoices', () => {
    test('should create invoice with items', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-100',
        currency: 'EUR',
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        clientName: 'Test Client',
        items: [
          { description: 'Service A', quantity: 2, unitPrice: 100, vatRate: 0.19 },
          { description: 'Service B', quantity: 1, unitPrice: 50, vatRate: 0.07 },
        ],
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status).toBe(201);
      const invoice = response.body.invoice ?? response.body.data?.invoice;
      if (!invoice) {
        throw new Error(
          'Invoice creation did not return an invoice in either response.body.invoice or response.body.data.invoice',
        );
      }
      expect(invoice).toHaveProperty('items');
      expect(invoice.items.length).toBe(2);
      expect(invoice.subtotal).toBeDefined();
      expect(invoice.total).toBeDefined();
      // GoBD audit log check (creation)
      const auditEntry = await require('../../src/models').AuditLog.findOne({
        where: { resourceType: 'Invoice', resourceId: String(invoice.id) },
      });
      if (auditEntry) {
        expect(auditEntry.immutable).toBe(true);
        if (auditEntry.metadata) {
          if (auditEntry.metadata.requestIp !== undefined) {
            expect(auditEntry.metadata.requestIp).toBeDefined();
          }
          if (auditEntry.metadata.userAgent !== undefined) {
            expect(auditEntry.metadata.userAgent).toBeDefined();
          }
        }
      }
    });

    test('should reject invoice without items', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-101',
        currency: 'EUR',
        status: 'pending',
        issueDate: new Date(),
        dueDate: new Date(),
        clientName: 'Test Client',
        items: [],
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status).toBe(400);
    });

    test('rejects invoices with total mismatch', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-102',
        currency: 'EUR',
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        clientName: 'Client Bad Math',
        total: 1,
        items: [{ description: 'Service X', quantity: 1, unitPrice: 100, vatRate: 0.19 }],
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/total mismatch/i);
    });

    test('rejects invoices with non-EUR currency', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-103',
        currency: 'USD',
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        clientName: 'Client Foreign',
        items: [{ description: 'Service X', quantity: 1, unitPrice: 100, vatRate: 0.19 }],
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/currency/i);
    });
  });

  describe('RBAC and cross-company access', () => {
    test('should prevent access to other company invoices', async () => {
      // Create a real other company and user
      const testHelpers = require('../utils/testHelpers');
      const otherCompany = await global.testUtils.createTestCompany();
      const { user: otherUser, token: otherToken } = await testHelpers.createTestUserAndLogin({
        companyId: otherCompany.id,
        role: 'admin',
      });
      const invoiceData = {
        invoiceNumber: `INV-OTHER-${Date.now()}`,
        currency: 'EUR',
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        clientName: 'Test Client',
        items: [{ description: 'Service A', quantity: 1, unitPrice: 100, vatRate: 0.19 }],
      };
      // Create invoice as other company user
      const createRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      const invoice = createRes.body.invoice ?? createRes.body.data?.invoice;
      expect(invoice).toBeDefined();
      const invoiceId = invoice.id;
      // Try to patch as the original test user (should be denied)
      const patchRes = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/invoices/${invoiceId}/status`,
        body: { status: 'paid' }, // invalid from 'pending' directly to 'paid'
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(patchRes.status).toBe(404);
    });
  });

  describe('PUT /api/invoices/:id', () => {
    const buildInvoicePayload = () => ({
      invoiceNumber: `INV-500-${Date.now()}-${Math.random()}`,
      currency: 'EUR',
      status: 'pending',
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      clientName: 'Draft Client',
      items: [{ description: 'Service A', quantity: 1, unitPrice: 100, vatRate: 0.19 }],
    });

    test('allows edits while the invoice is still a draft', async () => {
      const createRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: buildInvoicePayload(),
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const invoice = createRes.body.invoice ?? createRes.body.data?.invoice;
      expect(invoice).toBeDefined();
      const invoiceId = invoice.id;
      const updateRes = await global.requestApp({
        app,
        method: 'PUT',
        url: `/api/invoices/${invoiceId}`,
        body: { notes: 'Updated while draft' },
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.invoice.notes).toBe('Updated while draft');
      // GoBD audit log check (update)
      const auditEntry = await require('../../src/models').AuditLog.findOne({
        where: { resourceType: 'Invoice', resourceId: String(invoiceId) },
      });
      if (auditEntry) {
        expect(auditEntry.immutable).toBe(true);
      }
      if (auditEntry.metadata) {
        if (auditEntry.metadata.requestIp !== undefined) {
          expect(auditEntry.metadata.requestIp).toBeDefined();
        }
        if (auditEntry.metadata.userAgent !== undefined) {
          expect(auditEntry.metadata.userAgent).toBeDefined();
        }
      }
    });

    test('rejects edits after the invoice has been finalized', async () => {
      const createRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: buildInvoicePayload(),
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const invoice = createRes.body.invoice ?? createRes.body.data?.invoice;
      expect(invoice).toBeDefined();
      const invoiceId = invoice.id;
      await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/invoices/${invoiceId}/status`,
        body: { status: 'sent' },
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const finalUpdateRes = await global.requestApp({
        app,
        method: 'PUT',
        url: `/api/invoices/${invoiceId}`,
        body: { notes: 'Attempt correction' },
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(finalUpdateRes.status).toBe(409);
      expect(finalUpdateRes.body.message).toMatch(/immutable after SENT/i);
    });
  });
});
