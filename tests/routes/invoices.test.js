
const express = require('express');
const invoiceRoutes = require('../../src/routes/invoices');
const { Invoice, User } = require('../../src/models');

let mockCurrentUser = { id: 1, role: 'admin', companyId: null };
jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: mockCurrentUser.id, role: mockCurrentUser.role, companyId: mockCurrentUser.companyId };
    req.userId = req.user.id;
    req.companyId = req.user.companyId;
    next();
  },
  requireCompany: (req, res, next) => {
    req.companyId = req.companyId || mockCurrentUser.companyId;
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/invoices', invoiceRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Invoice Routes', () => {
  let testCompany;
  let testUser;

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    testCompany = await global.testUtils.createTestCompany();
    testUser = await global.testUtils.createTestUser({ companyId: testCompany.id });
    mockCurrentUser = { id: testUser.id, role: testUser.role, companyId: testUser.companyId };
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
        status: 'paid',
        userId: testUser.id,
        companyId: testCompany.id,
      });

      const response = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/invoices',
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
      });
      expect(response.status).toBe(201);
      expect(response.body.invoice).toHaveProperty('items');
      expect(response.body.invoice.items.length).toBe(2);
      expect(response.body.invoice.subtotal).toBeDefined();
      expect(response.body.invoice.total).toBeDefined();
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
        items: [
          { description: 'Service X', quantity: 1, unitPrice: 100, vatRate: 0.19 },
        ],
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
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
        items: [
          { description: 'Service X', quantity: 1, unitPrice: 100, vatRate: 0.19 },
        ],
      };
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/currency/i);
    });
  });

  describe('RBAC and cross-company access', () => {
    test('should prevent access to other company invoices', async () => {
      // Create a real other company
      const testHelpers = require('../utils/testHelpers');
      const otherCompany = await testHelpers.createTestCompany();
      const otherUser = await testHelpers.createTestUser({ companyId: otherCompany.id });
      const invoice = await Invoice.create({
        invoiceNumber: 'INV-200',
        date: new Date(),
        dueDate: new Date(),
        clientName: 'Other Co',
        subtotal: 100,
        total: 119,
        currency: 'EUR',
        status: 'pending',
        userId: otherUser.id,
        companyId: otherCompany.id,
      });
      const response = await global.requestApp({
        app,
        method: 'GET',
        url: `/api/invoices/${invoice.id}`,
      });
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/invoices/:id/status', () => {
    test('should allow valid status transition', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-300',
        currency: 'EUR',
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        clientName: 'Test Client',
        items: [
          { description: 'Service A', quantity: 1, unitPrice: 100, vatRate: 0.19 },
        ],
      };
      const createRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
      });
      const invoiceId = createRes.body.invoice.id;
      const patchRes = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/invoices/${invoiceId}/status`,
        body: { status: 'sent' },
      });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.invoice.status).toBe('SENT');
    });

    test('should reject invalid status transition', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-301',
        currency: 'EUR',
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date().toISOString().slice(0, 10),
        clientName: 'Test Client',
        items: [
          { description: 'Service A', quantity: 1, unitPrice: 100, vatRate: 0.19 },
        ],
      };
      const createRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: invoiceData,
      });
      const invoiceId = createRes.body.invoice.id;
      const patchRes = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/invoices/${invoiceId}/status`,
        body: { status: 'paid' }, // invalid from 'pending' directly to 'paid'
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
      items: [
        { description: 'Service A', quantity: 1, unitPrice: 100, vatRate: 0.19 },
      ],
    });

    test('allows edits while the invoice is still a draft', async () => {
      const createRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: buildInvoicePayload(),
      });
      const invoiceId = createRes.body.invoice.id;
      const updateRes = await global.requestApp({
        app,
        method: 'PUT',
        url: `/api/invoices/${invoiceId}`,
        body: { notes: 'Updated while draft' },
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.invoice.notes).toBe('Updated while draft');
    });

    test('rejects edits after the invoice has been finalized', async () => {
      const createRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        body: buildInvoicePayload(),
      });
      const invoiceId = createRes.body.invoice.id;
      await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/invoices/${invoiceId}/status`,
        body: { status: 'sent' },
      });
      const finalUpdateRes = await global.requestApp({
        app,
        method: 'PUT',
        url: `/api/invoices/${invoiceId}`,
        body: { notes: 'Attempt correction' },
      });
      expect(finalUpdateRes.status).toBe(400);
      expect(finalUpdateRes.body.message).toMatch(/correction entry/i);
    });
  });
});
