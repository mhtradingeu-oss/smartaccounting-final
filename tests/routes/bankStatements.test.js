const bcrypt = require('bcryptjs');
const express = require('express');
const { BankStatement, BankTransaction, User, AuditLog } = require('../../src/models');
const bankStatementsRoutes = require('../../src/routes/bankStatements');
const { withRequestContext } = require('../utils/testHelpers');

const app = express();
app.use(express.json());
app.use('/api/bank-statements', bankStatementsRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Bank Statements Routes', () => {
  let authToken;
  let currentUser;

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    const result = await global.testUtils.createTestUserAndLogin();
    currentUser = result.user;
    authToken = result.token;
  });

  afterAll(async () => {
    await global.testUtils.cleanDatabase();
  });

  it('requires authentication', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/bank-statements',
    });
    expect(response.status).toBe(401);
  });

  it('enforces company context', async () => {
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const orphanUser = await User.create({
      email: 'nocompstatements@example.com',
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
      url: '/api/bank-statements',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('COMPANY_REQUIRED');
  });

  it('lists the company bank statements', async () => {
    await BankStatement.create({
      companyId: currentUser.companyId,
      userId: currentUser.id,
      bankName: 'Test Bank',
      accountNumber: 'DE123456',
      fileName: 'statement.csv',
      fileFormat: 'CSV',
      statementPeriodStart: new Date(),
      statementPeriodEnd: new Date(),
      openingBalance: 0,
      closingBalance: 100,
    });

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/bank-statements',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(1);
  });

  it('categorizes transactions', async () => {
    const bankStatement = await BankStatement.create({
      companyId: currentUser.companyId,
      userId: currentUser.id,
      bankName: 'Test Bank',
      accountNumber: 'DE654321',
      fileName: 'statement.csv',
      fileFormat: 'CSV',
      statementPeriodStart: new Date(),
      statementPeriodEnd: new Date(),
      openingBalance: 0,
      closingBalance: 50,
    });

    const transaction = await BankTransaction.create({
      companyId: currentUser.companyId,
      bankStatementId: bankStatement.id,
      transactionDate: new Date(),
      description: 'Sample transaction',
      amount: 12.34,
      currency: 'EUR',
      transactionType: 'CREDIT',
    });

    const correlationId = `bank-categorize-${Date.now()}`;
    const response = await withRequestContext(correlationId, () =>
      global.requestApp({
        app,
        method: 'PUT',
        url: `/api/bank-statements/transactions/${transaction.id}/categorize`,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: {
          category: 'TEST',
          vatCategory: 'VAT',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.category).toBe('TEST');
    expect(response.body.data.vatCategory).toBe('VAT');

    const log = await AuditLog.findOne({
      where: {
        action: 'BANK_TRANSACTION_UPDATED',
        resourceId: String(transaction.id),
      },
    });
    expect(log).toBeTruthy();
    expect(log.userId).toBe(currentUser.id);
    expect(log.newValues?.category).toBe('TEST');
    expect(log.correlationId).toBe(correlationId);
    const logUser = await User.findByPk(log.userId);
    expect(logUser?.companyId).toBe(currentUser.companyId);
  });

  it('logs reconciliation attempts', async () => {
    const correlationId = `bank-reconcile-${Date.now()}`;
    const response = await withRequestContext(correlationId, () =>
      global.requestApp({
        app,
        method: 'POST',
        url: '/api/bank-statements/reconcile',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }),
    );

    expect(response.status).toBe(200);

    const reconciliationLog = await AuditLog.findOne({
      where: {
        action: 'BANK_TRANSACTIONS_RECONCILED',
        userId: currentUser.id,
      },
      order: [['createdAt', 'DESC']],
    });
    expect(reconciliationLog).toBeTruthy();
    expect(reconciliationLog.newValues?.reconciledCount).toBeDefined();
    expect(reconciliationLog.correlationId).toBe(correlationId);
    const logUser = await User.findByPk(reconciliationLog.userId);
    expect(logUser?.companyId).toBe(currentUser.companyId);
  });
});
