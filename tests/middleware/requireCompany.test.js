const express = require('express');
const requireCompany = require('../../src/middleware/requireCompany');
const { Company, User } = require('../../src/models');

const buildApp = () => {
  const app = express();
  app.use((req, _res, next) => {
    const rawUserId = req.headers['x-user-id'];
    req.userId = rawUserId ? Number(rawUserId) : null;
    req.isSystemAdmin = req.headers['x-system-admin'] === 'true';
    next();
  });
  app.get('/resource', requireCompany(), (req, res) => {
    res.json({ companyId: req.companyId });
  });
  return app;
};

describe('requireCompany middleware', () => {
  let app;
  let company;
  let otherCompany;
  let user;

  beforeEach(async () => {
    app = buildApp();
    company = await Company.create({
      name: `Tenant ${Date.now()}`,
      taxId: `REQ-${Date.now()}`,
      address: 'Tenant Address',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
    });
    otherCompany = await Company.create({
      name: `Other ${Date.now()}`,
      taxId: `REQ-OTHER-${Date.now()}`,
      address: 'Other Address',
      city: 'Munich',
      postalCode: '80331',
      country: 'Germany',
    });
    user = await User.create({
      email: `tenant-${Date.now()}@example.com`,
      password: 'hashed',
      firstName: 'Tenant',
      lastName: 'User',
      role: 'admin',
      companyId: company.id,
      isActive: true,
    });
  });

  afterEach(async () => {
    if (user) {
      await user.destroy({ force: true });
    }
    if (company) {
      await company.destroy({ force: true });
    }
    if (otherCompany) {
      await otherCompany.destroy({ force: true });
    }
  });

  it('returns 400 when x-company-id is missing', async () => {
    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/resource',
      headers: { 'x-user-id': String(user.id) },
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COMPANY_CONTEXT_REQUIRED');
  });

  it('returns 403 when x-company-id is invalid', async () => {
    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/resource',
      headers: { 'x-user-id': String(user.id), 'x-company-id': 'abc' },
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('COMPANY_CONTEXT_INVALID');
  });

  it('blocks system admins without explicit company access', async () => {
    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/resource',
      headers: {
        'x-user-id': String(user.id),
        'x-system-admin': 'true',
        'x-company-id': String(company.id),
      },
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('COMPANY_CONTEXT_INVALID');
  });

  it('returns 403 when the company does not match the user', async () => {
    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/resource',
      headers: { 'x-user-id': String(user.id), 'x-company-id': String(otherCompany.id) },
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('COMPANY_CONTEXT_INVALID');
  });

  it('allows access when the company matches the user', async () => {
    const res = await global.requestApp({
      app,
      method: 'GET',
      url: '/resource',
      headers: { 'x-user-id': String(user.id), 'x-company-id': String(company.id) },
    });

    expect(res.status).toBe(200);
    expect(res.body.companyId).toBe(company.id);
  });
});
