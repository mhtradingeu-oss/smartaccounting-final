process.env.API_BASE_URL = '/api';

const app = require('../../src/app');
const {
  AuditLog,
  ChartAccount,
  Company,
  JournalEntry,
  JournalEntryLine,
  User,
  sequelize,
} = require('../../src/models');
const accountingPostingService = require('../../src/services/accountingPostingService');

const authHeaders = ({ token, companyId }) => ({
  Authorization: `Bearer ${token}`,
  'x-company-id': companyId,
});

const requestFor = ({ method = 'post', url, token, companyId, body }) =>
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
    email: `journal-${role}-${Date.now()}-${Math.random()}@example.com`,
  });

describe('Journal entries API', () => {
  let company;
  let otherCompany;
  let admin;
  let accountant;
  let auditor;
  let viewer;
  let expenseAccount;
  let payableAccount;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await AuditLog.destroy({ where: {}, force: true });
    await JournalEntryLine.destroy({ where: {}, force: true });
    await JournalEntry.destroy({ where: {}, force: true });
    await ChartAccount.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Company.destroy({ where: {}, force: true });

    company = await Company.create({
      name: 'Journal Route Test GmbH',
      taxId: `JR-${Date.now()}-${Math.random()}`,
      address: 'Route Test 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
    });

    otherCompany = await Company.create({
      name: 'Other Journal Route GmbH',
      taxId: `JR-OTHER-${Date.now()}-${Math.random()}`,
      address: 'Other Route 1',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'DE',
    });

    admin = await createRoleSession('admin', company.id);
    accountant = await createRoleSession('accountant', company.id);
    auditor = await createRoleSession('auditor', company.id);
    viewer = await createRoleSession('viewer', company.id);

    expenseAccount = await ChartAccount.create({
      companyId: company.id,
      code: '4930',
      name: 'Office expenses',
      type: 'expense',
      normalBalance: 'debit',
      isSystem: true,
    });

    payableAccount = await ChartAccount.create({
      companyId: company.id,
      code: '1600',
      name: 'Accounts payable',
      type: 'liability',
      normalBalance: 'credit',
      isSystem: true,
    });
  });

  const createPostedJournalEntry = async ({ companyId = company.id, userId = accountant.user.id } = {}) => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: `journal-route-${Date.now()}-${Math.random()}`,
      createdBy: userId,
      lines: [
        { accountId: expenseAccount.id, debit: 100, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 100 },
      ],
    });

    await draft.journalEntry.update({
      status: 'posted',
      postedAt: new Date(),
      postedBy: userId,
    });

    return JournalEntry.findByPk(draft.journalEntry.id, {
      include: [{ model: JournalEntryLine, as: 'lines' }],
    });
  };



  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can list journal entries for the active company', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];
    const postedEntry = await createPostedJournalEntry({ userId: session.user.id });

    const response = await requestFor({
      method: 'get',
      url: '/api/journal-entries',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.journalEntries)).toBe(true);
    expect(response.body.journalEntries.some((entry) => entry.id === postedEntry.id)).toBe(true);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        limit: expect.any(Number),
        offset: expect.any(Number),
      }),
    );
  });

  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can get a same-company journal entry detail with lines', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];
    const postedEntry = await createPostedJournalEntry({ userId: session.user.id });

    const response = await requestFor({
      method: 'get',
      url: `/api/journal-entries/${postedEntry.id}`,
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.journalEntry.id).toBe(postedEntry.id);
    expect(response.body.journalEntry.companyId).toBe(company.id);
    expect(response.body.journalEntry.lines).toHaveLength(2);
  });

  it('filters journal entries by status and sourceType', async () => {
    const postedEntry = await createPostedJournalEntry({ userId: accountant.user.id });

    await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual_draft_filter',
      sourceId: 'draft-filter-test',
      createdBy: accountant.user.id,
      lines: [
        { accountId: expenseAccount.id, debit: 50, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 50 },
      ],
    });

    const response = await requestFor({
      method: 'get',
      url: '/api/journal-entries?status=posted&sourceType=manual',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.journalEntries.every((entry) => entry.status === 'posted')).toBe(true);
    expect(response.body.journalEntries.every((entry) => entry.sourceType === 'manual')).toBe(true);
    expect(response.body.journalEntries.some((entry) => entry.id === postedEntry.id)).toBe(true);
  });

  it('keeps journal entry detail scoped to the active company', async () => {
    const otherAccountant = await createRoleSession('accountant', otherCompany.id);

    const otherExpenseAccount = await ChartAccount.create({
      companyId: otherCompany.id,
      code: '4930',
      name: 'Other read expenses',
      type: 'expense',
      normalBalance: 'debit',
      isSystem: true,
    });

    const otherPayableAccount = await ChartAccount.create({
      companyId: otherCompany.id,
      code: '1600',
      name: 'Other read payable',
      type: 'liability',
      normalBalance: 'credit',
      isSystem: true,
    });

    const otherDraft = await accountingPostingService.createJournalEntryDraft({
      companyId: otherCompany.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'other-company-read-test',
      createdBy: otherAccountant.user.id,
      lines: [
        { accountId: otherExpenseAccount.id, debit: 100, credit: 0 },
        { accountId: otherPayableAccount.id, debit: 0, credit: 100 },
      ],
    });

    const response = await requestFor({
      method: 'get',
      url: `/api/journal-entries/${otherDraft.journalEntry.id}`,
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(404);
  });






  it.each(['admin', 'accountant', 'auditor'])('%s can export journal entries as JSON', async (role) => {
    const session = { admin, accountant, auditor }[role];
    const postedEntry = await createPostedJournalEntry({ userId: accountant.user.id });

    const response = await requestFor({
      method: 'get',
      url: '/api/journal-entries/export?format=json&status=posted',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        companyId: company.id,
        count: expect.any(Number),
        format: 'json',
      }),
    );
    expect(Array.isArray(response.body.rows)).toBe(true);
    expect(response.body.rows.some((row) => row.journalEntryId === postedEntry.id)).toBe(true);
    expect(response.body.rows.every((row) => row.companyId === company.id)).toBe(true);
  });

  it('exports journal entries as CSV for auditors', async () => {
    const postedEntry = await createPostedJournalEntry({ userId: accountant.user.id });

    const response = await requestFor({
      method: 'get',
      url: '/api/journal-entries/export?format=csv&status=posted',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.res.getHeader('Content-Type')).toMatch(/text\/csv/);

    const csvBody = Buffer.isBuffer(response.body)
      ? response.body.toString('utf8')
      : response.text || String(response.body || '');

    expect(csvBody).toContain('journalEntryId,companyId,entryDate,status');
    expect(csvBody).toContain(postedEntry.id);
  });

  it('viewer cannot export journal entries', async () => {
    const response = await requestFor({
      method: 'get',
      url: '/api/journal-entries/export?format=json',
      token: viewer.token,
      companyId: viewer.user.companyId,
    });

    expect(response.status).toBe(403);
  });

  it('rejects unsupported journal export format', async () => {
    const response = await requestFor({
      method: 'get',
      url: '/api/journal-entries/export?format=xlsx',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });


  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can read same-company journal entry audit log', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];
    const postedEntry = await createPostedJournalEntry({ userId: accountant.user.id });

    await requestFor({
      url: `/api/journal-entries/${postedEntry.id}/reverse`,
      token: accountant.token,
      companyId: accountant.user.companyId,
      body: {},
    });

    const response = await requestFor({
      method: 'get',
      url: `/api/journal-entries/${postedEntry.id}/audit-log`,
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.journalEntryId).toBe(postedEntry.id);
    expect(Array.isArray(response.body.auditLog)).toBe(true);
    expect(response.body.auditLog.some((log) => log.action === 'journal_entry_reversed')).toBe(true);
    expect(response.body.auditLog.every((log) => log.resourceType === 'JournalEntry')).toBe(true);
    expect(response.body.auditLog.every((log) => log.resourceId === postedEntry.id)).toBe(true);
    expect(response.body.auditLog.every((log) => log.companyId === company.id)).toBe(true);
  });

  it('keeps journal entry audit log scoped to the active company', async () => {
    const otherAccountant = await createRoleSession('accountant', otherCompany.id);

    const otherExpenseAccount = await ChartAccount.create({
      companyId: otherCompany.id,
      code: '4930',
      name: 'Other audit expenses',
      type: 'expense',
      normalBalance: 'debit',
      isSystem: true,
    });

    const otherPayableAccount = await ChartAccount.create({
      companyId: otherCompany.id,
      code: '1600',
      name: 'Other audit payable',
      type: 'liability',
      normalBalance: 'credit',
      isSystem: true,
    });

    const otherDraft = await accountingPostingService.createJournalEntryDraft({
      companyId: otherCompany.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'other-company-audit-log-test',
      createdBy: otherAccountant.user.id,
      lines: [
        { accountId: otherExpenseAccount.id, debit: 100, credit: 0 },
        { accountId: otherPayableAccount.id, debit: 0, credit: 100 },
      ],
    });

    const response = await requestFor({
      method: 'get',
      url: `/api/journal-entries/${otherDraft.journalEntry.id}/audit-log`,
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(404);
  });


  it('admin can reverse a posted journal entry', async () => {
    const postedEntry = await createPostedJournalEntry({ userId: admin.user.id });

    const response = await requestFor({
      url: `/api/journal-entries/${postedEntry.id}/reverse`,
      token: admin.token,
      companyId: admin.user.companyId,
      body: {},
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.reversed).toBe(true);
    expect(response.body.originalEntry.id).toBe(postedEntry.id);
    expect(response.body.originalEntry.reversedAt).toBeTruthy();
    expect(response.body.reversalEntry).toEqual(
      expect.objectContaining({
        status: 'posted',
        sourceType: 'journal_reversal',
        sourceId: String(postedEntry.id),
        reversalOfId: postedEntry.id,
      }),
    );
    expect(response.body.lines).toHaveLength(2);
  });

  it('accountant can reverse a posted journal entry', async () => {
    const postedEntry = await createPostedJournalEntry({ userId: accountant.user.id });

    const response = await requestFor({
      url: `/api/journal-entries/${postedEntry.id}/reverse`,
      token: accountant.token,
      companyId: accountant.user.companyId,
      body: {},
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.reversalEntry.reversalOfId).toBe(postedEntry.id);

    const auditLog = await AuditLog.findOne({
      where: {
        action: 'journal_entry_reversed',
        resourceType: 'JournalEntry',
        resourceId: String(postedEntry.id),
        companyId: company.id,
        userId: accountant.user.id,
      },
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog.immutable).toBe(true);
  });

  it('auditor and viewer cannot reverse journal entries', async () => {
    const postedEntry = await createPostedJournalEntry({ userId: accountant.user.id });

    const auditorResponse = await requestFor({
      url: `/api/journal-entries/${postedEntry.id}/reverse`,
      token: auditor.token,
      companyId: auditor.user.companyId,
      body: {},
    });

    const viewerResponse = await requestFor({
      url: `/api/journal-entries/${postedEntry.id}/reverse`,
      token: viewer.token,
      companyId: viewer.user.companyId,
      body: {},
    });

    expect(auditorResponse.status).toBe(403);
    expect(viewerResponse.status).toBe(403);
  });

  it('keeps journal entry reversal scoped to the active company', async () => {
    const otherAccountant = await createRoleSession('accountant', otherCompany.id);

    const otherExpenseAccount = await ChartAccount.create({
      companyId: otherCompany.id,
      code: '4930',
      name: 'Other office expenses',
      type: 'expense',
      normalBalance: 'debit',
      isSystem: true,
    });

    const otherPayableAccount = await ChartAccount.create({
      companyId: otherCompany.id,
      code: '1600',
      name: 'Other accounts payable',
      type: 'liability',
      normalBalance: 'credit',
      isSystem: true,
    });

    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId: otherCompany.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'other-company-route-reversal',
      createdBy: otherAccountant.user.id,
      lines: [
        { accountId: otherExpenseAccount.id, debit: 100, credit: 0 },
        { accountId: otherPayableAccount.id, debit: 0, credit: 100 },
      ],
    });

    await draft.journalEntry.update({
      status: 'posted',
      postedAt: new Date(),
      postedBy: otherAccountant.user.id,
    });

    const response = await requestFor({
      url: `/api/journal-entries/${draft.journalEntry.id}/reverse`,
      token: accountant.token,
      companyId: accountant.user.companyId,
      body: {},
    });

    expect(response.status).toBe(404);
  });

  it('prevents duplicate journal entry reversal through the route', async () => {
    const postedEntry = await createPostedJournalEntry({ userId: accountant.user.id });

    const first = await requestFor({
      url: `/api/journal-entries/${postedEntry.id}/reverse`,
      token: accountant.token,
      companyId: accountant.user.companyId,
      body: {},
    });

    const second = await requestFor({
      url: `/api/journal-entries/${postedEntry.id}/reverse`,
      token: accountant.token,
      companyId: accountant.user.companyId,
      body: {},
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.errorCode).toBe('JOURNAL_ENTRY_ALREADY_REVERSED');
  });
});
