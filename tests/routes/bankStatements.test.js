const previousBankImportEnabled = process.env.BANK_IMPORT_ENABLED;
process.env.BANK_IMPORT_ENABLED = 'false';

const path = require('path');
const fs = require('fs');

jest.mock('../../src/middleware/secureUpload', () => {
  const multerPath = require('path');
  const createSecureUploader = () => ({
    single: () => (req, res, next) => {
      const mockPath = req.get('X-Mock-Bank-Statement-Path');
      if (mockPath) {
        req.file = {
          fieldname: 'bankStatement',
          originalname: multerPath.basename(mockPath),
          path: mockPath,
          mimetype: 'text/csv',
          size: 0,
        };
      }
      next();
    },
  });

  const logUploadMetadata = (req, res, next) => next();
  return {
    createSecureUploader,
    logUploadMetadata,
  };
});

const app = require('../../src/app');
const request = require('../utils/request')(app);
const {
  BankStatement,
  BankTransaction,
  AuditLog,
  Company,
  BankStatementImportDryRun,
  Invoice,
  Expense,
  Transaction,
} = require('../../src/models');

const clearManualReconciliationData = async (user) => {
  if (!user) {
    return;
  }
  await AuditLog.destroy({ where: { userId: user.id }, force: true });
  if (user.companyId) {
    await Transaction.destroy({ where: { companyId: user.companyId }, force: true });
    await Expense.destroy({ where: { companyId: user.companyId }, force: true });
    await Invoice.destroy({ where: { companyId: user.companyId }, force: true });
    await BankTransaction.destroy({ where: { companyId: user.companyId }, force: true });
    await BankStatement.destroy({ where: { companyId: user.companyId }, force: true });
    await Company.destroy({ where: { id: user.companyId }, force: true });
  }
  await user.destroy({ force: true });
};

const createStatement = async (companyId) => {
  return BankStatement.create({
    companyId,
    fileName: 'manual-reconcile.csv',
    fileFormat: 'CSV',
    statementDate: new Date(),
    statementPeriodStart: new Date(),
    statementPeriodEnd: new Date(),
    status: 'COMPLETED',
    totalTransactions: 1,
    processedTransactions: 1,
    importDate: new Date(),
  });
};

const createTransaction = async (companyId, bankStatementId) => {
  return BankTransaction.create({
    companyId,
    bankStatementId,
    transactionDate: new Date(),
    description: 'Manual reconciliation candidate',
    amount: 1234.56,
    currency: 'EUR',
    transactionType: 'CREDIT',
  });
};

describe('Bank statement import gate', () => {
  let testUser;
  let authToken;

  afterAll(() => {
    process.env.BANK_IMPORT_ENABLED = previousBankImportEnabled;
  });

  afterEach(async () => {
    if (!testUser) {
      return;
    }
    await AuditLog.destroy({ where: { userId: testUser.id }, force: true });
    const companyId = testUser.companyId;
    await testUser.destroy({ force: true });
    if (companyId) {
      await BankTransaction.destroy({ where: { companyId }, force: true });
      await BankStatement.destroy({ where: { companyId }, force: true });
      await Company.destroy({ where: { id: companyId }, force: true });
    }
    testUser = null;
    authToken = null;
  });

  it('rejects import requests when the feature flag is disabled and does not create records', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;
    const companyId = testUser.companyId;

    const statementsBefore = await BankStatement.count({ where: { companyId } });
    const transactionsBefore = await BankTransaction.count({ where: { companyId } });

    const response = await request
      .post('/api/bank-statements/import')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ format: 'CSV' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'IMPORT_DISABLED',
      message: 'Bank statement import is currently disabled.',
    });

    const statementsAfter = await BankStatement.count({ where: { companyId } });
    const transactionsAfter = await BankTransaction.count({ where: { companyId } });

    expect(statementsAfter).toBe(statementsBefore);
    expect(transactionsAfter).toBe(transactionsBefore);
  });
});

describe('Bank statement import dry run', () => {
  const fixtureFile = path.join(__dirname, '..', 'fixtures', 'bank-statement-dry-run.csv');
  const uploadDir = path.resolve(
    process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'secure'),
    'bank-statements',
  );
  let testUser;
  let authToken;

  const cleanUploadFiles = () => {
    if (!fs.existsSync(uploadDir)) {
      return;
    }
    fs.readdirSync(uploadDir).forEach((filename) => {
      const filePath = path.join(uploadDir, filename);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        // best effort cleanup
      }
    });
  };

  afterEach(async () => {
    cleanUploadFiles();
    if (!testUser) {
      return;
    }
    await AuditLog.destroy({ where: { userId: testUser.id }, force: true });
    const companyId = testUser.companyId;
    if (companyId) {
      await BankStatementImportDryRun.destroy({ where: { companyId }, force: true });
    }
    await testUser.destroy({ force: true });
    if (companyId) {
      await BankTransaction.destroy({ where: { companyId }, force: true });
      await BankStatement.destroy({ where: { companyId }, force: true });
      await Company.destroy({ where: { id: companyId }, force: true });
    }
    testUser = null;
    authToken = null;
  });

  it('runs the dry-run import path and does not touch the database', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const response = await request
      .post('/api/bank-statements/import')
      .query({ dryRun: 'true' })
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Mock-Bank-Statement-Path', fixtureFile)
      .send({ format: 'CSV' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      mode: 'dry-run',
    });
    expect(response.body.summary).toMatchObject({
      transactionsDetected: 2,
      validTransactions: 2,
      invalidTransactions: 0,
      currency: 'EUR',
    });
    expect(Array.isArray(response.body.matches)).toBe(true);
    expect(Array.isArray(response.body.unmatched)).toBe(true);
    expect(Array.isArray(response.body.warnings)).toBe(true);

    const companyId = testUser.companyId;
    const statementsAfter = await BankStatement.count({ where: { companyId } });
    const transactionsAfter = await BankTransaction.count({ where: { companyId } });
    expect(statementsAfter).toBe(0);
    expect(transactionsAfter).toBe(0);

    const auditEntry = await AuditLog.findOne({
      where: { userId: testUser.id, action: 'bank_import_dry_run' },
      order: [['createdAt', 'DESC']],
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.reason).toMatch(/Dry run/i);
  });

  it('still blocks the import when dryRun flag is false', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });
    testUser = result.user;
    authToken = result.token;

    const response = await request
      .post('/api/bank-statements/import')
      .query({ dryRun: 'false' })
      .set('Authorization', `Bearer ${authToken}`)
      .send({ format: 'CSV' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'IMPORT_DISABLED',
      message: 'Bank statement import is currently disabled.',
    });
  });
});

describe('Bank statement import confirmation', () => {
  const fixtureFile = path.join(__dirname, '..', 'fixtures', 'bank-statement-dry-run.csv');
  let testUser;
  let authToken;
  let viewer;

  beforeAll(() => {
    process.env.BANK_IMPORT_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.BANK_IMPORT_ENABLED = 'false';
  });

  afterEach(async () => {
    if (viewer) {
      await viewer.destroy({ force: true });
      viewer = null;
    }
    if (!testUser) {
      return;
    }
    await AuditLog.destroy({ where: { userId: testUser.id }, force: true });
    const companyId = testUser.companyId;
    if (companyId) {
      await BankStatementImportDryRun.destroy({ where: { companyId }, force: true });
    }
    await testUser.destroy({ force: true });
    if (companyId) {
      await BankTransaction.destroy({ where: { companyId }, force: true });
      await BankStatement.destroy({ where: { companyId }, force: true });
      await Company.destroy({ where: { id: companyId }, force: true });
    }
    testUser = null;
    authToken = null;
  });

  it('confirms a previously dry-run import', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });
    testUser = result.user;
    authToken = result.token;

    const dryRunResponse = await request
      .post('/api/bank-statements/import')
      .query({ dryRun: 'true' })
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Mock-Bank-Statement-Path', fixtureFile)
      .send({ format: 'CSV' });

    expect(dryRunResponse.status).toBe(200);
    const confirmationToken = dryRunResponse.body.confirmationToken;
    const dryRunId = dryRunResponse.body.dryRunId;
    expect(confirmationToken).toBeDefined();

    const confirmResponse = await request
      .post('/api/bank-statements/import/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ confirmationToken });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.success).toBe(true);
    expect(confirmResponse.body.data).toMatchObject({
      dryRunId,
      summary: {
        totalImported: 2,
        totalProcessed: 2,
        duplicatesSkipped: 0,
      },
    });
    expect(confirmResponse.body.data.bankStatementId).toBeGreaterThan(0);

    const statements = await BankStatement.findAll({
      where: { companyId: testUser.companyId },
    });
    expect(statements.length).toBe(1);
    expect(statements[0].status).toBe('COMPLETED');

    const transactionCount = await BankTransaction.count({ where: { companyId: testUser.companyId } });
    expect(transactionCount).toBeGreaterThan(0);

    const dryRunRecord = await BankStatementImportDryRun.findOne({
      where: { confirmationToken },
    });
    expect(dryRunRecord).not.toBeNull();
    expect(dryRunRecord.status).toBe('CONFIRMED');
    expect(dryRunRecord.bankStatementId).toBe(confirmResponse.body.data.bankStatementId);

    const auditEntry = await AuditLog.findOne({
      where: { userId: testUser.id, action: 'bank_import_confirmed' },
      order: [['createdAt', 'DESC']],
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.newValues.dryRunId).toBe(dryRunId);
    expect(auditEntry.newValues.counts).toEqual(confirmResponse.body.data.summary);
  });

  it('rejects duplicate confirmations', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const dryRunResponse = await request
      .post('/api/bank-statements/import')
      .query({ dryRun: 'true' })
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Mock-Bank-Statement-Path', fixtureFile)
      .send({ format: 'CSV' });

    const { confirmationToken } = dryRunResponse.body;

    await request
      .post('/api/bank-statements/import/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ confirmationToken });

    const duplicateResponse = await request
      .post('/api/bank-statements/import/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ confirmationToken });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.message).toMatch(/already consumed/);
  });

  it('blocks viewers from confirming an import', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const dryRunResponse = await request
      .post('/api/bank-statements/import')
      .query({ dryRun: 'true' })
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Mock-Bank-Statement-Path', fixtureFile)
      .send({ format: 'CSV' });

    viewer = await global.testUtils.createTestUser({ role: 'viewer', companyId: testUser.companyId });
    const viewerToken = global.testUtils.createAuthToken(viewer.id);

    const response = await request
      .post('/api/bank-statements/import/confirm')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ confirmationToken: dryRunResponse.body.confirmationToken });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Insufficient permissions',
      code: 'INSUFFICIENT_ROLE',
    });
  });

  it('honors the BANK_IMPORT_ENABLED feature flag', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const dryRunResponse = await request
      .post('/api/bank-statements/import')
      .query({ dryRun: 'true' })
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Mock-Bank-Statement-Path', fixtureFile)
      .send({ format: 'CSV' });

    const previousFlag = process.env.BANK_IMPORT_ENABLED;
    process.env.BANK_IMPORT_ENABLED = 'false';

    const disabledResponse = await request
      .post('/api/bank-statements/import/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ confirmationToken: dryRunResponse.body.confirmationToken });

    process.env.BANK_IMPORT_ENABLED = previousFlag;

    expect(disabledResponse.status).toBe(503);
    expect(disabledResponse.body).toEqual({
      error: 'IMPORT_DISABLED',
      message: 'Bank statement import is currently disabled.',
    });

    const statementCount = await BankStatement.count({ where: { companyId: testUser.companyId } });
    expect(statementCount).toBe(0);

    const dryRunRecord = await BankStatementImportDryRun.findOne({
      where: { confirmationToken: dryRunResponse.body.confirmationToken },
    });
    expect(dryRunRecord.status).toBe('PENDING');
  });
});

describe('Manual reconciliation endpoint', () => {
  let testUser;
  let authToken;
  let viewerUser;
  let otherUser;

  afterEach(async () => {
    await clearManualReconciliationData(viewerUser);
    await clearManualReconciliationData(otherUser);
    await clearManualReconciliationData(testUser);
    viewerUser = null;
    otherUser = null;
    testUser = null;
    authToken = null;
  });

  it('reconciles the bank transaction and writes an audit log entry', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const bankStatement = await createStatement(testUser.companyId);
    const bankTransaction = await createTransaction(testUser.companyId, bankStatement.id);
    const invoice = await global.testUtils.createTestInvoice(testUser.id, {
      total: 1234.56,
      amount: 1234.56,
      status: 'SENT',
    });

    const response = await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ targetType: 'invoice', targetId: invoice.id, reason: 'Manual match reason' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isReconciled).toBe(true);
    expect(response.body.data.reconciledWith).toBeDefined();

    const updatedStore = await BankTransaction.findByPk(bankTransaction.id);
    expect(updatedStore.isReconciled).toBe(true);
    expect(updatedStore.reconciledWith).toBe(response.body.data.reconciledWith);

    const ledgerTransaction = await Transaction.findOne({
      where: { bankTransactionId: bankTransaction.id },
    });
    expect(ledgerTransaction).not.toBeNull();
    expect(Number(ledgerTransaction.amount)).toBeCloseTo(1234.56);
    expect(ledgerTransaction.isReconciled).toBe(true);

    const auditEntry = await AuditLog.findOne({
      where: { userId: testUser.id, action: 'bank_transaction_reconciled' },
      order: [['createdAt', 'DESC']],
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.reason).toBe('Manual match reason');
    expect(auditEntry.newValues.metadata).toEqual({
      bankTransactionId: bankTransaction.id,
      targetType: 'invoice',
      targetId: invoice.id,
    });
  });

  it('rejects a transaction that is already reconciled', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });
    testUser = result.user;
    authToken = result.token;

    const bankStatement = await createStatement(testUser.companyId);
    const bankTransaction = await createTransaction(testUser.companyId, bankStatement.id);
    const invoice = await global.testUtils.createTestInvoice(testUser.id, {
      total: 500,
      amount: 500,
      status: 'SENT',
    });

    const payload = { targetType: 'invoice', targetId: invoice.id };
    const firstResponse = await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);

    expect(firstResponse.status).toBe(200);

    const secondResponse = await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload);
    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.message).toMatch(/already reconciled/i);
  });

  it('returns 403 when the user does not have sufficient role', async () => {
    const viewerResult = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });
    viewerUser = viewerResult.user;
    const viewerToken = viewerResult.token;

    const bankStatement = await createStatement(viewerUser.companyId);
    const bankTransaction = await createTransaction(viewerUser.companyId, bankStatement.id);
    const invoice = await global.testUtils.createTestInvoice(viewerUser.id, {
      total: 200,
      amount: 200,
      status: 'SENT',
    });

    const response = await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ targetType: 'invoice', targetId: invoice.id });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Insufficient permissions',
      code: 'INSUFFICIENT_ROLE',
    });
  });

  it('rejects targets that belong to another company', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const bankStatement = await createStatement(testUser.companyId);
    const bankTransaction = await createTransaction(testUser.companyId, bankStatement.id);
    const otherResult = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    otherUser = otherResult.user;
    const externalInvoice = await global.testUtils.createTestInvoice(otherUser.id, {
      total: 10,
      amount: 10,
      status: 'SENT',
    });

    const response = await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ targetType: 'invoice', targetId: externalInvoice.id });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Invoice not found');

    const unchanged = await BankTransaction.findByPk(bankTransaction.id);
    expect(unchanged.isReconciled).toBe(false);
  });
});

describe('Manual reconciliation undo and audit log', () => {
  let testUser;
  let authToken;

  afterEach(async () => {
    await clearManualReconciliationData(testUser);
    testUser = null;
    authToken = null;
  });

  it('undoes reconciliation and records an audit entry', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const bankStatement = await createStatement(testUser.companyId);
    const bankTransaction = await createTransaction(testUser.companyId, bankStatement.id);
    const invoice = await global.testUtils.createTestInvoice(testUser.id, {
      total: 1234.56,
      amount: 1234.56,
      status: 'SENT',
    });

    await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ targetType: 'invoice', targetId: invoice.id });

    const undoResponse = await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile/undo`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Mistaken match' });

    expect(undoResponse.status).toBe(200);
    expect(undoResponse.body.success).toBe(true);
    expect(undoResponse.body.data.isReconciled).toBe(false);
    expect(undoResponse.body.data.reconciledWith).toBeNull();

    const reloadedTransaction = await BankTransaction.findByPk(bankTransaction.id);
    expect(reloadedTransaction.isReconciled).toBe(false);
    expect(reloadedTransaction.reconciledWith).toBeNull();

    const ledgerTransaction = await Transaction.findOne({
      where: { reference: `invoice:${invoice.id}` },
    });
    expect(ledgerTransaction).not.toBeNull();
    expect(ledgerTransaction.isReconciled).toBe(false);
    expect(ledgerTransaction.bankTransactionId).toBeNull();

    const auditEntry = await AuditLog.findOne({
      where: { userId: testUser.id, action: 'bank_transaction_reconciliation_undone' },
      order: [['createdAt', 'DESC']],
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.reason).toBe('Mistaken match');
    expect(auditEntry.newValues?.metadata?.bankTransactionId).toBe(bankTransaction.id);
    expect(auditEntry.newValues?.metadata?.ledgerTransactionId).toBe(ledgerTransaction?.id ?? null);
  });

  it('requires a reason to undo reconciliation', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const bankStatement = await createStatement(testUser.companyId);
    const bankTransaction = await createTransaction(testUser.companyId, bankStatement.id);
    const invoice = await global.testUtils.createTestInvoice(testUser.id, {
      total: 200,
      amount: 200,
      status: 'SENT',
    });

    await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ targetType: 'invoice', targetId: invoice.id });

    const response = await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile/undo`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: '' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Reason is required to undo reconciliation');
  });

  it('exposes audit log entries for the statement', async () => {
    const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    testUser = result.user;
    authToken = result.token;

    const bankStatement = await createStatement(testUser.companyId);
    const bankTransaction = await createTransaction(testUser.companyId, bankStatement.id);
    const invoice = await global.testUtils.createTestInvoice(testUser.id, {
      total: 500,
      amount: 500,
      status: 'SENT',
    });

    await request
      .post(`/api/bank-statements/transactions/${bankTransaction.id}/reconcile`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ targetType: 'invoice', targetId: invoice.id });

    const auditResponse = await request
      .get(`/api/bank-statements/${bankStatement.id}/audit-logs`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.success).toBe(true);
    expect(Array.isArray(auditResponse.body.data)).toBe(true);
    const reconcileEntry = auditResponse.body.data.find(
      (entry) => entry.action === 'bank_transaction_reconciled',
    );
    expect(reconcileEntry).toBeDefined();
    expect(reconcileEntry.resourceId).toBe(String(bankTransaction.id));
    expect(reconcileEntry.userId).toBe(testUser.id);
  });
});
