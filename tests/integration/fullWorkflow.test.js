
const express = require('express');
const { sequelize } = require('../../src/models');

// Import all routes
const authRoutes = require('../../src/routes/auth');
const invoiceRoutes = require('../../src/routes/invoices');
const dashboardRoutes = require('../../src/routes/dashboard');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Full Workflow Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Ensure database is synced
    await sequelize.sync({ force: true });
  });

  describe('Complete User Journey', () => {
    test('should complete full invoice workflow', async () => {
      // 1. Register user
      const registerResponse = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/register',
        body: {
          email: 'workflow@example.com',
          password: 'password123',
          firstName: 'Workflow',
          lastName: 'User',
          role: 'admin',
        },
      });

      expect(registerResponse.status).toBe(201);

      // 2. Login user
      const loginResponse = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'workflow@example.com',
          password: 'password123',
        },
      });

      expect(loginResponse.status).toBe(200);
      authToken = loginResponse.body.token;

      // 3. Create invoice (with items[] and no direct amount injection)
      const items = [
        {
          description: 'Consulting Service',
          quantity: 10,
          unitPrice: 200,
          vatRate: 19,
        },
      ];
      const today = new Date();
      const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const invoiceResponse = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/invoices',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          invoiceNumber: 'INV-WORKFLOW-001',
          items,
          currency: 'EUR',
          date: today.toISOString().slice(0, 10),
          dueDate: due.toISOString().slice(0, 10),
          clientName: 'Integration Test Client',
        },
      });

      expect(invoiceResponse.status).toBe(201);
      const invoice = invoiceResponse.body.invoice;
      const invoiceId = invoice.id;

      // Assert server-calculated amounts
      expect(invoice).toHaveProperty('total');
      expect(invoice).toHaveProperty('subtotal');
      expect(invoice.total).toBeGreaterThan(0);
      expect(invoice.subtotal).toBeGreaterThan(0);
      // Assert VAT at item level
      expect(invoice.items[0]).toHaveProperty('lineVat');
      expect(invoice.items[0].lineVat).toBeGreaterThan(0);

      // 4. Get dashboard data
      const dashboardResponse = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body).toHaveProperty('totalRevenue');

      // 5. Update invoice status: DRAFT → SENT
      const sentResponse = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/invoices/${invoiceId}/status`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          status: 'SENT',
        },
      });
      expect(sentResponse.status).toBe(200);
      expect(sentResponse.body.invoice.status).toBe('SENT');

      // 6. Update invoice status: SENT → PAID
      const paidResponse = await global.requestApp({
        app,
        method: 'PATCH',
        url: `/api/invoices/${invoiceId}/status`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          status: 'PAID',
        },
      });
      expect(paidResponse.status).toBe(200);
      expect(paidResponse.body.invoice.status).toBe('PAID');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle unauthorized access properly', async () => {
      const response = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/dashboard/stats',
      });

      expect(response.status).toBe(401);
    });

    test('should handle invalid token', async () => {
      const response = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.status).toBe(401);
    });
  });
});
