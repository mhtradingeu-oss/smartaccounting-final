const app = require('../../src/app');
const { Company } = require('../../src/models');

describe('Auth smoke test', () => {
  const loginPath = '/api/auth/login';
  const companiesPath = '/api/companies';

  it('logs in and accesses a protected route with the returned token', async () => {
    const credentials = {
      email: 'test@example.com',
      password: 'testpass123',
    };

    const loginResponse = await global.requestApp({
      app,
      method: 'POST',
      url: loginPath,
      body: credentials,
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.user).toMatchObject({ email: credentials.email });
    expect(loginResponse.body.token).toBeDefined();

    const company = await Company.create({
      name: 'Smoke Test Company',
      taxId: `SMOKE-${Date.now()}`,
      address: '1 Demo Dr',
      city: 'Test City',
      postalCode: '12345',
      country: 'DemoLand',
      userId: global.testUser.id,
    });
    await global.testUser.update({ companyId: company.id });
    await global.testUser.reload();

    const companiesResponse = await global.requestApp({
      app,
      method: 'GET',
      url: companiesPath,
      headers: {
        Authorization: `Bearer ${loginResponse.body.token}`,
      },
    });
    expect(companiesResponse.status).toBe(200);

    expect(Array.isArray(companiesResponse.body.companies)).toBe(true);
    const returnedCompany = companiesResponse.body.companies.find((c) => c.id === company.id);
    expect(returnedCompany).toBeDefined();
  });
});
