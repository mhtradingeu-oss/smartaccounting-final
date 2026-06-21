process.env.API_BASE_URL = '/api';

const app = require('../../src/app');
const { AuditLog, Expense, FileAttachment, JournalEntry, JournalEntryLine, ChartAccount } = require('../../src/models');
const buildSystemContext = require('../utils/buildSystemContext');
const { buildExpensePayload } = require('../utils/buildPayload');

const roles = ['admin', 'accountant', 'auditor', 'viewer'];
const writeRoles = ['admin', 'accountant'];
const readOnlyRoles = ['auditor', 'viewer'];

const authHeaders = ({ token, companyId }) => ({
  Authorization: `Bearer ${token}`,
  'x-company-id': companyId,
});

const requestFor = ({ method = 'get', url = '/api/expenses', token, companyId, body }) =>
  global.requestApp({
    app,
    method,
    url,
    headers: authHeaders({ token, companyId }),
    body,
  });

const createRoleSession = (role, companyId = global.testCompany.id) =>
  global.testUtils.createTestUserAndLogin({
    role,
    companyId,
    email: `expenses-${role}-${Date.now()}-${Math.random()}@example.com`,
  });

const payloadFor = (user, overrides = {}) =>
  buildExpensePayload({
    companyId: user.companyId,
    createdByUserId: user.id,
    userId: user.id,
    status: 'pending',
    ...overrides,
  });

const createPayloadFor = (user, overrides = {}) => ({
  companyId: user.companyId,
  createdByUserId: user.id,
  expenseDate: new Date().toISOString().slice(0, 10),
  currency: 'EUR',
  status: 'pending',
  source: 'manual',
  category: 'Travel',
  description: 'Test expense',
  vendorName: 'Test Vendor',
  netAmount: 100,
  vatRate: 0.19,
  vatAmount: 19,
  grossAmount: 119,
  ...overrides,
});

const createExpenseFor = (user, overrides = {}) => Expense.create(payloadFor(user, overrides));

beforeEach(async () => {
  await AuditLog.destroy({ where: {} });
  await FileAttachment.destroy({ where: {}, force: true });
  await Expense.destroy({ where: {} });
});

describe('Expenses API', () => {
  describe('read access', () => {
    it.each(roles)('%s can list and get expenses', async (role) => {
      const { user, token } = await createRoleSession(role);
      const expense = await createExpenseFor(user, { description: `${role} expense` });

      const listRes = await requestFor({
        token,
        companyId: user.companyId,
      });
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.expenses)).toBe(true);
      expect(listRes.body.expenses.some((item) => item.id === expense.id)).toBe(true);

      const getRes = await requestFor({
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}`,
      });
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.expense.id).toBe(expense.id);
      expect(getRes.body.expense.status).toBe('pending');
    });
  });

  describe('create access', () => {
    it.each(writeRoles)('%s can create expenses with audit log', async (role) => {
      const { user, token } = await createRoleSession(role);

      const res = await requestFor({
        method: 'post',
        token,
        companyId: user.companyId,
        body: {
          ...createPayloadFor(user, { description: `${role} created expense` }),
          systemContext: buildSystemContext({ user }),
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.expense.status).toBe('pending');
      expect(res.body.expense.currency).toBe('EUR');

      const auditEntry = await AuditLog.findOne({
        where: { resourceType: 'Expense', resourceId: String(res.body.expense.id) },
      });
      expect(auditEntry).toBeTruthy();
      expect(auditEntry.immutable).toBe(true);
    });

    it.each(readOnlyRoles)('%s cannot create expenses', async (role) => {
      const { user, token } = await createRoleSession(role);

      const res = await requestFor({
        method: 'post',
        token,
        companyId: user.companyId,
        body: payloadFor(user),
      });

      expect(res.status).toBe(403);
    });

    it('links same-company source document attachment when creating an expense draft', async () => {
      const { user, token } = await createRoleSession('accountant');
      const document = await FileAttachment.create({
        fileName: 'receipt.pdf',
        originalName: 'receipt.pdf',
        filePath: '/tmp/receipt.pdf',
        fileSize: 100,
        mimeType: 'application/pdf',
        documentType: 'receipt',
        userId: user.id,
        companyId: user.companyId,
        uploadedBy: user.id,
        processingStatus: 'needs_review',
      });

      const res = await requestFor({
        method: 'post',
        token,
        companyId: user.companyId,
        body: {
          ...createPayloadFor(user, {
            source: 'ai_document_intake',
            attachments: [document.id],
            notes: 'Created from AI document intake review.',
            reason: 'Human confirmed AI document intake suggestion for draft creation',
            systemContext: {
              source: 'ai_document_intake',
              documentId: document.id,
              requestId: 'req-doc',
            },
          }),
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.expense.source).toBe('ai_document_intake');
      expect(res.body.reason).toBe(
        'Human confirmed AI document intake suggestion for draft creation',
      );

      const linkedDocument = await FileAttachment.findByPk(document.id);
      expect(linkedDocument.attachedToType).toBe('Expense');
      expect(linkedDocument.extractedData).toEqual(
        expect.objectContaining({
          linkedExpenseId: res.body.expense.id,
          linkedVia: 'ai_document_intake_confirmed_draft',
        }),
      );
      expect(linkedDocument.companyId).toBe(user.companyId);
    });
  });

  describe('posting preview', () => {
    it('admin can create an expense posting preview without changing expense status', async () => {
      const { user, token } = await createRoleSession('admin');

      const expense = await Expense.create({
        companyId: user.companyId,
        userId: user.id,
        createdByUserId: user.id,
        date: new Date('2026-06-21'),
        expenseDate: new Date('2026-06-21'),
        vendorName: 'Posting Preview Vendor',
        description: 'Preview expense',
        category: 'software',
        netAmount: 100,
        vatRate: 0.19,
        vatAmount: 19,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      const response = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token,
        companyId: user.companyId,
        body: {},
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          previewOnly: true,
          message: 'Expense posting preview created',
          journalEntry: expect.objectContaining({
            companyId: user.companyId,
            sourceType: 'expense',
            sourceId: String(expense.id),
            status: 'draft',
          }),
          lines: expect.any(Array),
        }),
      );

      const journalEntry = await JournalEntry.findByPk(response.body.journalEntry.id, {
        include: [{ model: JournalEntryLine, as: 'lines' }],
      });

      expect(journalEntry).toBeTruthy();
      expect(journalEntry.lines).toHaveLength(3);

      const persistedLines = await JournalEntryLine.findAll({
        where: { journalEntryId: journalEntry.id },
        include: [{ model: ChartAccount, as: 'account' }],
      });

      expect(persistedLines.map((line) => line.account.code).sort()).toEqual(['1576', '1600', '4930']);

      await expense.reload();
      expect(expense.status).toBe('pending');
    });

    it('admin can create a restricted expense posting preview without input VAT', async () => {
      const { user, token } = await createRoleSession('admin');

      const expense = await Expense.create({
        companyId: user.companyId,
        userId: user.id,
        createdByUserId: user.id,
        date: new Date('2026-06-21'),
        expenseDate: new Date('2026-06-21'),
        vendorName: 'Restricted Taxi Vendor',
        description: 'Restricted taxi expense',
        category: 'travel',
        netAmount: 119,
        vatRate: 0,
        vatAmount: 0,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'ai_document_intake_reviewed',
        taxTreatment: 'no_vorsteuer_allowed',
        inputVatAllowed: false,
        accountantReviewRequired: true,
      });

      const response = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token,
        companyId: user.companyId,
        body: {},
      });
      expect(response.status).toBe(201);

      const persistedLines = await JournalEntryLine.findAll({
        where: { journalEntryId: response.body.journalEntry.id },
        include: [{ model: ChartAccount, as: 'account' }],
      });

      expect(persistedLines).toHaveLength(2);
      expect(persistedLines.map((line) => line.account.code).sort()).toEqual(['1600', '4930']);
    });


    it('reuses an existing expense posting preview when called twice', async () => {
      const { token, user } = await createRoleSession('admin');

      const expense = await Expense.create({
        companyId: user.companyId,
        userId: user.id,
        createdByUserId: user.id,
        date: new Date('2026-06-21'),
        category: 'office',
        vendorName: 'Route Duplicate Preview Vendor',
        description: 'Route duplicate preview prevention',
        expenseDate: '2026-06-21',
        amount: 119,
        grossAmount: 119,
        netAmount: 100,
        vatAmount: 19,
        vatRate: 19,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      const first = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token,
        companyId: user.companyId,
        body: {},
      });

      const second = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token,
        companyId: user.companyId,
        body: {},
      });

      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(first.body.reusedPreview).toBe(false);
      expect(second.body.reusedPreview).toBe(true);
      expect(second.body.journalEntry.id).toBe(first.body.journalEntry.id);

      const entries = await JournalEntry.findAll({
        where: {
          companyId: user.companyId,
          sourceType: 'expense',
          sourceId: String(expense.id),
          status: 'draft',
        },
      });

      const lines = await JournalEntryLine.findAll({
        where: {
          journalEntryId: first.body.journalEntry.id,
        },
      });

      expect(entries).toHaveLength(1);
      expect(lines).toHaveLength(3);
    });


    it('admin can finalize an expense posting preview', async () => {
      const { user, token } = await createRoleSession('admin');

      const expense = await Expense.create({
        companyId: user.companyId,
        userId: user.id,
        createdByUserId: user.id,
        date: new Date('2026-06-21'),
        category: 'office',
        vendorName: 'Route Final Posting Vendor',
        description: 'Route final posting test',
        expenseDate: '2026-06-21',
        netAmount: 100,
        vatRate: 19,
        vatAmount: 19,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      const preview = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token,
        companyId: user.companyId,
        body: {},
      });

      expect(preview.status).toBe(201);

      const response = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/post`,
        token,
        companyId: user.companyId,
        body: {},
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Expense posting finalized',
          posted: true,
          finalizedFromPreview: true,
        }),
      );
      expect(response.body.journalEntry.id).toBe(preview.body.journalEntry.id);
      expect(response.body.journalEntry.status).toBe('posted');
      expect(response.body.lines).toHaveLength(3);

      await expense.reload();
      expect(expense.status).toBe('pending');

      const auditLog = await AuditLog.findOne({
        where: {
          action: 'expense_posting_finalized',
          resourceType: 'JournalEntry',
          resourceId: String(response.body.journalEntry.id),
          companyId: user.companyId,
          userId: user.id,
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.immutable).toBe(true);
    });

    it('rejects final expense posting when no preview exists', async () => {
      const { user, token } = await createRoleSession('admin');

      const expense = await Expense.create({
        companyId: user.companyId,
        userId: user.id,
        createdByUserId: user.id,
        date: new Date('2026-06-21'),
        category: 'office',
        vendorName: 'Route No Preview Vendor',
        description: 'Route no preview final posting test',
        expenseDate: '2026-06-21',
        netAmount: 100,
        vatRate: 19,
        vatAmount: 19,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      const response = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/post`,
        token,
        companyId: user.companyId,
        body: {},
      });

      expect(response.status).toBe(409);
      expect(response.body.errorCode).toBe('EXPENSE_POSTING_PREVIEW_REQUIRED');
    });

    it('prevents duplicate final expense posting through the route', async () => {
      const { user, token } = await createRoleSession('admin');

      const expense = await Expense.create({
        companyId: user.companyId,
        userId: user.id,
        createdByUserId: user.id,
        date: new Date('2026-06-21'),
        category: 'office',
        vendorName: 'Route Duplicate Final Vendor',
        description: 'Route duplicate final posting test',
        expenseDate: '2026-06-21',
        netAmount: 100,
        vatRate: 19,
        vatAmount: 19,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token,
        companyId: user.companyId,
        body: {},
      });

      const first = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/post`,
        token,
        companyId: user.companyId,
        body: {},
      });

      const second = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/post`,
        token,
        companyId: user.companyId,
        body: {},
      });

      expect(first.status).toBe(200);
      expect(second.status).toBe(409);
      expect(second.body.errorCode).toBe('EXPENSE_POSTING_ALREADY_FINALIZED');

      const entries = await JournalEntry.findAll({
        where: {
          companyId: user.companyId,
          sourceType: 'expense',
          sourceId: String(expense.id),
        },
      });

      expect(entries).toHaveLength(1);
    });

    it('auditor and viewer cannot finalize expense postings', async () => {
      const { user: accountantUser, token: accountantToken } = await createRoleSession('accountant');

      const expense = await Expense.create({
        companyId: accountantUser.companyId,
        userId: accountantUser.id,
        createdByUserId: accountantUser.id,
        date: new Date('2026-06-21'),
        category: 'office',
        vendorName: 'Forbidden Final Posting Vendor',
        description: 'Forbidden final posting test',
        expenseDate: '2026-06-21',
        netAmount: 100,
        vatRate: 19,
        vatAmount: 19,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token: accountantToken,
        companyId: accountantUser.companyId,
        body: {},
      });

      const auditor = await createRoleSession('auditor', accountantUser.companyId);
      const viewer = await createRoleSession('viewer', accountantUser.companyId);

      const auditorResponse = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/post`,
        token: auditor.token,
        companyId: accountantUser.companyId,
        body: {},
      });

      const viewerResponse = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/post`,
        token: viewer.token,
        companyId: accountantUser.companyId,
        body: {},
      });

      expect(auditorResponse.status).toBe(403);
      expect(viewerResponse.status).toBe(403);
    });

    it('auditor and viewer cannot create expense posting previews', async () => {
      const { user: accountantUser } = await createRoleSession('accountant');
      const expense = await Expense.create({
        companyId: accountantUser.companyId,
        userId: accountantUser.id,
        createdByUserId: accountantUser.id,
        date: new Date('2026-06-21'),
        expenseDate: new Date('2026-06-21'),
        vendorName: 'Read Only Vendor',
        description: 'Read only preview expense',
        category: 'software',
        netAmount: 100,
        vatRate: 0.19,
        vatAmount: 19,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      const auditor = await createRoleSession('auditor', accountantUser.companyId);
      const viewer = await createRoleSession('viewer', accountantUser.companyId);

      const auditorResponse = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token: auditor.token,
        companyId: accountantUser.companyId,
        body: {},
      });

      const viewerResponse = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token: viewer.token,
        companyId: accountantUser.companyId,
        body: {},
      });

      expect(auditorResponse.status).toBe(403);
      expect(viewerResponse.status).toBe(403);
    });

    it('keeps expense posting preview scoped to the active company', async () => {
      const companyA = await createRoleSession('accountant');
      const companyB = await createRoleSession('accountant');

      const expense = await Expense.create({
        companyId: companyB.user.companyId,
        userId: companyB.user.id,
        createdByUserId: companyB.user.id,
        date: new Date('2026-06-21'),
        expenseDate: new Date('2026-06-21'),
        vendorName: 'Other Company Vendor',
        description: 'Other company expense',
        category: 'software',
        netAmount: 100,
        vatRate: 0.19,
        vatAmount: 19,
        grossAmount: 119,
        amount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'manual',
      });

      const response = await requestFor({
        method: 'post',
        url: `/api/expenses/${expense.id}/posting-preview`,
        token: companyA.token,
        companyId: companyA.user.companyId,
        body: {},
      });
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('status changes', () => {
    it.each(writeRoles)('%s can change allowed expense status transitions', async (role) => {
      const { user, token } = await createRoleSession(role);
      const expense = await createExpenseFor(user, { status: 'pending' });

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked', systemContext: buildSystemContext({ user }) },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.expense.status).toBe('booked');
    });

    it.each(readOnlyRoles)('%s cannot change expense status', async (role) => {
      const owner = await createRoleSession('admin');
      const expense = await createExpenseFor(owner.user, { status: 'pending' });
      const { user, token } = await createRoleSession(role, owner.user.companyId);

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked' },
      });

      expect(res.status).toBe(403);
    });

    it('rejects invalid transitions with 409', async () => {
      const { user, token } = await createRoleSession('admin');
      const expense = await createExpenseFor(user, { status: 'archived' });

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked' },
      });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
    });

    it('normalizes legacy pending statuses during transitions', async () => {
      const { user, token } = await createRoleSession('admin');
      const expense = await createExpenseFor(user, { status: 'PENDING' });

      const res = await requestFor({
        method: 'patch',
        token,
        companyId: user.companyId,
        url: `/api/expenses/${expense.id}/status`,
        body: { status: 'booked' },
      });

      expect(res.status).toBe(200);
      expect(res.body.expense.status).toBe('booked');
    });
  });

  it('denies cross-company expense access', async () => {
    const owner = await createRoleSession('admin');
    const otherCompany = await global.testUtils.createTestCompany();
    const outsider = await createRoleSession('admin', otherCompany.id);
    const expense = await createExpenseFor(owner.user);

    const res = await requestFor({
      token: outsider.token,
      companyId: outsider.user.companyId,
      url: `/api/expenses/${expense.id}`,
    });

    expect(res.status).toBe(404);
  });

  it('enforces EUR currency integrity', async () => {
    const { user, token } = await createRoleSession('admin');

    const res = await requestFor({
      method: 'post',
      token,
      companyId: user.companyId,
      body: createPayloadFor(user, { currency: 'USD' }),
    });

    expect(res.status).toBe(400);
  });

  it('enforces VAT total integrity', async () => {
    const { user, token } = await createRoleSession('admin');

    const res = await requestFor({
      method: 'post',
      token,
      companyId: user.companyId,
      body: createPayloadFor(user, { vatAmount: 1, grossAmount: 101 }),
    });

    expect(res.status).toBe(400);
  });
});
