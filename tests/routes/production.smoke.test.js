const { app } = require('../../src/server');
const { Company, Invoice } = require('../../src/models');

const canBindSockets = require('../utils/canBindSockets')();

const supertest = require('supertest');

if (!canBindSockets) {
  // eslint-disable-next-line no-console
  console.warn('Production smoke suite skipped: unable to bind sockets in this environment.');
}

const credentials = {
  email: 'test@example.com',
  password: 'testpass123',
};

const describeIfSockets = canBindSockets ? describe : describe.skip;

describeIfSockets('Production smoke suite', () => {
  let authToken;
  let createdCompany;
  let createdInvoiceId;
  let supertestApp;

  beforeAll(async () => {
    supertestApp = supertest(app);
    const loginRes = await supertestApp.post('/api/auth/login').send(credentials);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeDefined();
    authToken = loginRes.body.token;
  });

  it('logs in, lists companies, and lists invoices', async () => {
    const { buildCompanyPayload, buildInvoicePayload } = require('../utils/buildPayload');
    const company = await Company.create(
      buildCompanyPayload({
        name: `Smoke Test Co ${Date.now()}`,
        taxId: `SMOKE-${Date.now()}`,
        userId: global.testUser.id,
      }),
    );
    createdCompany = company;
    await global.testUser.update({ companyId: company.id });
    await global.testUser.reload();

    const companiesRes = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/companies',
      headers: { Authorization: `Bearer ${authToken}`, 'x-company-id': company.id },
    });
    expect(companiesRes.status).toBe(200);
    expect(Array.isArray(companiesRes.body.companies)).toBe(true);
    expect(companiesRes.body.companies.some((entry) => entry.id === company.id)).toBe(true);

    const invoicePayload = buildInvoicePayload({
      invoiceNumber: `SMOKE-${Date.now()}`,
      clientName: 'Smoke Customer',
      companyId: company.id,
      userId: global.testUser.id,
      items: [
        {
          description: 'Smoke verification',
          quantity: 1,
          unitPrice: 190,
          vatRate: 0.19,
        },
      ],
    });

    const invoiceRes = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/invoices',
      headers: { Authorization: `Bearer ${authToken}`, 'x-company-id': company.id },
      body: invoicePayload,
    });
    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.success).toBe(true);
    expect(invoiceRes.body.invoice).toBeDefined();
    createdInvoiceId = invoiceRes.body.invoice.id;

    const invoicesRes = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/invoices',
      headers: { Authorization: `Bearer ${authToken}`, 'x-company-id': company.id },
    });
    expect(invoicesRes.status).toBe(200);
    expect(Array.isArray(invoicesRes.body.invoices)).toBe(true);
    expect(invoicesRes.body.invoices.some((inv) => inv.id === createdInvoiceId)).toBe(true);
  });

  afterAll(async () => {
    if (createdInvoiceId) {
      try {
        const invoice = await Invoice.findByPk(createdInvoiceId);
        if (invoice) {
          await Invoice.destroy({ where: { id: createdInvoiceId }, force: true });
        }
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
    if (createdCompany) {
      try {
        const company = await Company.findByPk(createdCompany.id);
        if (company) {
          await Company.destroy({ where: { id: createdCompany.id }, force: true });
        }
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
    if (global.testUser) {
      try {
        await global.testUser.update({ companyId: null });
      } catch (err) {
        // Ignore errors during cleanup
      }
    }
  });
});
