const app = require('../../src/app');
const request = require('../utils/request')(app);
const { BankStatement, BankTransaction, Company } = require('../../src/models');

describe('Bank statements list endpoint', () => {
  let testUser;
  let authToken;
  let usersToCleanup;
  let companyIdsToCleanup;

  beforeEach(() => {
    usersToCleanup = [];
    companyIdsToCleanup = [];
  });

  const trackUser = (user) => {
    if (user) {
      usersToCleanup.push(user);
      if (user.companyId) {
        companyIdsToCleanup.push(user.companyId);
      }
    }
    return user;
  };

  afterEach(async () => {
    if (testUser) {
      trackUser(testUser);
    }

    const companyIds = [...new Set(companyIdsToCleanup.filter(Boolean))];
    for (const companyId of companyIds) {
      await BankTransaction.destroy({ where: { companyId }, force: true });
      await BankStatement.destroy({ where: { companyId }, force: true });
    }

    const users = [...new Map(usersToCleanup.filter(Boolean).map((user) => [user.id, user])).values()];
    for (const user of users) {
      await user.destroy({ force: true });
    }

    for (const companyId of companyIds) {
      await Company.destroy({ where: { id: companyId }, force: true });
    }

    testUser = null;
    authToken = null;
    usersToCleanup = [];
    companyIdsToCleanup = [];
  });

  it('returns statementDate on list responses so seeded statements stay compliant', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;
    const statementDate = '2025-01-31';
    const statement = await BankStatement.create({
      companyId: testUser.companyId,
      fileName: 'list-statement-date.csv',
      fileFormat: 'CSV',
      statementDate,
      openingBalance: 5000,
      closingBalance: 6200,
      bankName: 'List Bank',
      accountNumber: 'DE12345678901234567890',
      currency: 'EUR',
      status: 'COMPLETED',
      importDate: '2025-02-01',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request
      .get('/api/bank-statements')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', testUser.companyId);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const returnedStatement = response.body.data.find((row) => row.id === statement.id);
    expect(returnedStatement).toBeDefined();
    expect(returnedStatement.statementDate).toBe(statementDate);
  });

  it('returns a same-company statement detail for admins', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;
    const statement = await BankStatement.create({
      companyId: testUser.companyId,
      fileName: 'detail.csv',
      fileFormat: 'CSV',
      statementDate: '2025-01-31',
      status: 'COMPLETED',
    });

    const response = await request
      .get(`/api/bank-statements/${statement.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', testUser.companyId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: statement.id,
        companyId: testUser.companyId,
        fileName: 'detail.csv',
      },
    });
  });

  it('allows auditors to read same-company statement detail', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'auditor' });
    testUser = result.user;
    authToken = result.token;
    const statement = await BankStatement.create({
      companyId: testUser.companyId,
      fileName: 'auditor-detail.csv',
      fileFormat: 'CSV',
      statementDate: '2025-01-31',
      status: 'COMPLETED',
    });

    const response = await request
      .get(`/api/bank-statements/${statement.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', testUser.companyId);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(statement.id);
  });

  it('blocks viewers from statement detail', async () => {
    const adminResult = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = adminResult.user;
    authToken = adminResult.token;
    const statement = await BankStatement.create({
      companyId: testUser.companyId,
      fileName: 'viewer-blocked.csv',
      fileFormat: 'CSV',
      statementDate: '2025-01-31',
      status: 'COMPLETED',
    });
    const viewer = trackUser(
      await global.testUtils.createTestUser({
        role: 'viewer',
        companyId: testUser.companyId,
      }),
    );
    const viewerToken = global.testUtils.createAuthToken(viewer.id, viewer.companyId);

    const response = await request
      .get(`/api/bank-statements/${statement.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-company-id', testUser.companyId);

    expect(response.status).toBe(403);
  });

  it('returns 404 for statement detail from another company', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;
    const otherResult = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    trackUser(otherResult.user);
    const otherStatement = await BankStatement.create({
      companyId: otherResult.user.companyId,
      fileName: 'other-company.csv',
      fileFormat: 'CSV',
      statementDate: '2025-01-31',
      status: 'COMPLETED',
    });

    const response = await request
      .get(`/api/bank-statements/${otherStatement.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-company-id', testUser.companyId);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
