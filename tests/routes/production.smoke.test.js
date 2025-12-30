const http = require('http');
const request = require('supertest');
const app = require('../../src/app');
const { Company, Invoice } = require('../../src/models');

const canBindSockets = require('../utils/canBindSockets')();

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
  let server;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
    });

    const loginRes = await request(server).post('/api/auth/login').send(credentials);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeDefined();
    authToken = loginRes.body.token;
  });

  it('logs in, lists companies, and lists invoices', async () => {
    const company = await Company.create({
      name: `Smoke Test Co ${Date.now()}`,
      taxId: `SMOKE-${Date.now()}`,
      address: '1 Smoke Way',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      userId: global.testUser.id,
    });
    createdCompany = company;
    await global.testUser.update({ companyId: company.id });
    await global.testUser.reload();

    const companiesRes = await request(server)
      .get('/api/companies')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(companiesRes.body.companies)).toBe(true);
    expect(companiesRes.body.companies.some((entry) => entry.id === company.id)).toBe(true);

    const invoicePayload = {
      invoiceNumber: `SMOKE-${Date.now()}`,
      currency: 'EUR',
      status: 'SENT',
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      clientName: 'Smoke Customer',
      items: [
        {
          description: 'Smoke verification',
          quantity: 1,
          unitPrice: 190,
        vatRate: 0.19,
        },
      ],
    };

    const invoiceRes = await request(server)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invoicePayload)
      .expect(201);

    expect(invoiceRes.body.success).toBe(true);
    expect(invoiceRes.body.invoice).toBeDefined();
    createdInvoiceId = invoiceRes.body.invoice.id;

    const invoicesRes = await request(server)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(invoicesRes.body.invoices)).toBe(true);
    expect(invoicesRes.body.invoices.some((inv) => inv.id === createdInvoiceId)).toBe(true);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(() => resolve()));
    }
    if (createdInvoiceId) {
      await Invoice.destroy({ where: { id: createdInvoiceId }, force: true });
    }
    if (createdCompany) {
      await Company.destroy({ where: { id: createdCompany.id }, force: true });
    }
    await global.testUser.update({ companyId: null });
  });
});
