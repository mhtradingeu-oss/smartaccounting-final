const bcrypt = require('bcryptjs');
const express = require('express');
const companiesRoutes = require('../../src/routes/companies');
const { Company, User } = require('../../src/models');

const app = express();
app.use(express.json());
app.use('/api/companies', companiesRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Companies Routes', () => {
  let authToken;
  let currentUser;
  let currentCompany;

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    const result = await global.testUtils.createTestUserAndLogin();
    currentUser = result.user;
    authToken = result.token;
    currentCompany = await Company.findByPk(currentUser.companyId);
  });

  afterAll(async () => {
    await global.testUtils.cleanDatabase();
  });

  it('blocks requests without authentication', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/companies',
    });

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('error');
  });

  it('requires a company context', async () => {
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const orphanUser = await User.create({
      email: 'nocomp@example.com',
      password: hashedPassword,
      firstName: 'No',
      lastName: 'Company',
      role: 'admin',
      isActive: true,
      companyId: null,
    });
    const token = global.testUtils.createAuthToken(orphanUser.id);

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/companies',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('COMPANY_REQUIRED');
  });

  it('lists the authenticated user company', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/companies',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.companies)).toBe(true);
    expect(response.body.companies).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: currentCompany.id })]),
    );
  });

  it('updates company details when administered', async () => {
    const response = await global.requestApp({
      app,
      method: 'PUT',
      url: `/api/companies/${currentCompany.id}`,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: {
        name: 'Updated Company Name',
      },
    });
    expect(response.status).toBe(200);
    expect(response.body.company.name).toBe('Updated Company Name');
  });
});
