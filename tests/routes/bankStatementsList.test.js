const app = require('../../src/app');
const request = require('../utils/request')(app);
const { BankStatement, BankTransaction, Company } = require('../../src/models');

describe('Bank statements list endpoint', () => {
  let testUser;
  let authToken;

  afterEach(async () => {
    if (!testUser) {
      return;
    }
    const companyId = testUser.companyId;
    await BankTransaction.destroy({ where: { companyId }, force: true });
    await BankStatement.destroy({ where: { companyId }, force: true });
    await Company.destroy({ where: { id: companyId }, force: true });
    await testUser.destroy({ force: true });
    testUser = null;
    authToken = null;
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
});
