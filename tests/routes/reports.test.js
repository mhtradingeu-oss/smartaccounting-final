const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Company, User, ChartAccount } = require('../../src/models');
const accountingPostingService = require('../../src/services/accountingPostingService');

describe('Financial reports API', () => {
  let company;
  let otherCompany;
  let admin;
  let accountant;
  let auditor;
  let viewer;
  let expenseAccount;
  let payableAccount;

  const createRoleSession = async (role, companyId = company.id) => {
    const session = await global.testUtils.createTestUserAndLogin({
      role,
      companyId,
    });

    return {
      user: session.user,
      token: session.token,
    };
  };

  const requestFor = ({ url, token, companyId }) => {
    return request(app)
      .get(url)
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(companyId));
  };

  const createPostedJournalEntry = async ({
    companyId = company.id,
    userId = accountant.user.id,
    entryDate = '2026-06-21',
    expenseAccountId = expenseAccount.id,
    payableAccountId = payableAccount.id,
  } = {}) => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId,
      entryDate,
      sourceType: 'manual',
      sourceId: `trial-balance-${Date.now()}-${Math.random()}`,
      createdBy: userId,
      lines: [
        { accountId: expenseAccountId, debit: 100, credit: 0 },
        { accountId: payableAccountId, debit: 0, credit: 100 },
      ],
    });

    await draft.journalEntry.update(
      {
        status: 'posted',
        postedAt: new Date(),
        postedBy: userId,
      },
      { allowPostedJournalEntryMutation: true },
    );

    return draft.journalEntry;
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await sequelize.truncate({ cascade: true, restartIdentity: true });

    company = await Company.create({
      name: 'Report Company GmbH',
      taxId: 'REPORT-001',
      vatId: 'DE111111111',
      address: 'Report Str. 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
    });

    otherCompany = await Company.create({
      name: 'Other Report Company GmbH',
      taxId: 'REPORT-002',
      vatId: 'DE222222222',
      address: 'Other Report Str. 2',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'Germany',
    });

    admin = await createRoleSession('admin');
    accountant = await createRoleSession('accountant');
    auditor = await createRoleSession('auditor');
    viewer = await createRoleSession('viewer');

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
      name: 'Trade payables',
      type: 'liability',
      normalBalance: 'credit',
      isSystem: true,
    });
  });

  it.each(['admin', 'accountant', 'auditor', 'viewer'])('%s can read the trial balance report', async (role) => {
    const session = { admin, accountant, auditor, viewer }[role];

    await createPostedJournalEntry();

    const response = await requestFor({
      url: '/api/reports/trial-balance',
      token: session.token,
      companyId: session.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.report.companyId).toBe(company.id);
    expect(response.body.report.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: '4930',
          debitTotal: 100,
          creditTotal: 0,
          balance: 100,
        }),
        expect.objectContaining({
          accountCode: '1600',
          debitTotal: 0,
          creditTotal: 100,
          balance: 100,
        }),
      ]),
    );
    expect(response.body.report.totals).toEqual(
      expect.objectContaining({
        totalDebits: 100,
        totalCredits: 100,
        difference: 0,
        isBalanced: true,
      }),
    );
  });

  it('uses only posted journal entries in trial balance', async () => {
    await createPostedJournalEntry();

    await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'draft-should-not-count',
      createdBy: accountant.user.id,
      lines: [
        { accountId: expenseAccount.id, debit: 999, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 999 },
      ],
    });

    const response = await requestFor({
      url: '/api/reports/trial-balance',
      token: accountant.token,
      companyId: accountant.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals.totalDebits).toBe(100);
    expect(response.body.report.totals.totalCredits).toBe(100);
  });

  it('filters trial balance by date range', async () => {
    await createPostedJournalEntry({ entryDate: '2026-06-01' });
    await createPostedJournalEntry({ entryDate: '2026-07-01' });

    const response = await requestFor({
      url: '/api/reports/trial-balance?from=2026-07-01&to=2026-07-31',
      token: auditor.token,
      companyId: auditor.user.companyId,
    });

    expect(response.status).toBe(200);
    expect(response.body.report.totals.totalDebits).toBe(100);
    expect(response.body.report.totals.totalCredits).toBe(100);
    expect(response.body.report.filters).toEqual(
      expect.objectContaining({
        from: '2026-07-01',
        to: '2026-07-31',
        status: 'posted',
      }),
    );
  });

  it('prevents cross-company trial balance access', async () => {
    await createPostedJournalEntry();

    const response = await requestFor({
      url: '/api/reports/trial-balance',
      token: accountant.token,
      companyId: otherCompany.id,
    });

    expect(response.status).toBe(403);
  });
});
