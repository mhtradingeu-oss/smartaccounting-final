const app = require('../../src/app');
const request = require('../utils/request');
const demoSeed = require('../../database/seeders/demo/20251226-demo-seed.js');
const { sequelize } = require('../../src/lib/database');
const { ActiveToken, User } = require('../../src/models');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';

describe('Demo login + plan gating', () => {
  const agent = request(app);
  let queryInterface;

  beforeAll(async () => {
    process.env.DEMO_MODE = 'true';
    process.env.ALLOW_DEMO_SEED = 'true';
    queryInterface = sequelize.getQueryInterface();
    await demoSeed.up(queryInterface, sequelize);
  });

  afterAll(async () => {
    const demoEmails = demoSeed.DEMO_USERS.map((user) => user.email);
    const demoUsers = await User.findAll({ where: { email: demoEmails } });
    const demoUserIds = demoUsers.map((user) => user.id);
    if (demoUserIds.length) {
      await queryInterface.bulkDelete('audit_logs', { userId: demoUserIds }, {});
      await ActiveToken.destroy({ where: { userId: demoUserIds } });
    }
    await demoSeed.down(queryInterface, sequelize);
  });

  it('logs in demo-accountant and returns a company token', async () => {
    const response = await agent.post('/api/auth/login').send({
      email: 'demo-accountant@demo.com',
      password: DEMO_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    expect(response.body.user?.companyId).toBeDefined();
  });

  it('allows exports + ai insights when demo company uses a pro plan', async () => {
    const auditorLogin = await agent.post('/api/auth/login').send({
      email: 'demo-auditor@demo.com',
      password: DEMO_PASSWORD,
    });

    expect(auditorLogin.status).toBe(200);
    const auditorToken = auditorLogin.body.token;
    const companyId = auditorLogin.body.user?.companyId;
    expect(auditorToken).toBeDefined();
    expect(companyId).toBeDefined();

    const exportsRes = await agent
      .get('/api/exports/audit-logs')
      .query({ format: 'json' })
      .set('Authorization', `Bearer ${auditorToken}`)
      .set('x-company-id', companyId);

    expect(exportsRes.status).toBe(200);
    expect(exportsRes.body.success).toBe(true);

    const accountantLogin = await agent.post('/api/auth/login').send({
      email: 'demo-accountant@demo.com',
      password: DEMO_PASSWORD,
    });

    expect(accountantLogin.status).toBe(200);
    const accountantToken = accountantLogin.body.token;
    const statsResponse = await agent
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${accountantToken}`)
      .set('x-company-id', accountantLogin.body.user?.companyId)
      .set('x-ai-purpose', 'insights_read')
      .set('x-ai-policy-version', '10.0.0');

    expect([200, 204]).toContain(statsResponse.status);
    expect(statsResponse.body).toBeDefined();
  });
});
