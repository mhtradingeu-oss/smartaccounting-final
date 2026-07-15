'use strict';

const request = require('supertest');

const app = require('../../src/app');

const {
  Company,
  ChartAccount,
  JournalEntry,
  JournalEntryLine,
} = require('../../src/models');

const accountingPostingService =
  require('../../src/services/accountingPostingService');

const testUtils =
  require('../utils/testHelpers');

describe('BWA real runtime integration', () => {
  let company;
  let otherCompany;
  let accountant;
  let revenueAccount;
  let expenseAccount;
  let payableAccount;
  let unmappedExpenseAccount;

  beforeEach(async () => {
    await testUtils.cleanDatabase();

    company =
      await testUtils.createTestCompany();

    otherCompany =
      await testUtils.createTestCompany();

    accountant =
      await testUtils.createTestUserAndLogin({
        role: 'accountant',
        companyId: company.id,
      });

    revenueAccount = await ChartAccount.create({
      companyId: company.id,
      code: '8400',
      name: 'Revenue 19%',
      type: 'revenue',
      normalBalance: 'credit',
      metadata: {
        role: 'revenue_19',
        kontenrahmen: 'SKR03',
      },
    });

    expenseAccount = await ChartAccount.create({
      companyId: company.id,
      code: '4930',
      name: 'General Expense',
      type: 'expense',
      normalBalance: 'debit',
      metadata: {
        role: 'general_expense',
        kontenrahmen: 'SKR03',
      },
    });

    payableAccount = await ChartAccount.create({
      companyId: company.id,
      code: '1600',
      name: 'Trade Payables',
      type: 'liability',
      normalBalance: 'credit',
      metadata: {
        role: 'accounts_payable',
        kontenrahmen: 'SKR03',
      },
    });

    unmappedExpenseAccount =
      await ChartAccount.create({
        companyId: company.id,
        code: '6999',
        name: 'Unmapped Expense',
        type: 'expense',
        normalBalance: 'debit',
        metadata: {
          kontenrahmen: 'SKR03',
        },
      });
  });

  afterAll(async () => {
    await testUtils.cleanDatabase();
  });

  async function createEntry({
    entryDate,
    sourceType,
    sourceId,
    lines,
    status = 'posted',
    companyId = company.id,
    userId = accountant.user.id,
  }) {
    const result =
      await accountingPostingService
        .createJournalEntryDraft({
          companyId,
          entryDate,
          sourceType,
          sourceId,
          description: `BWA integration ${sourceType}`,
          currency: 'EUR',
          createdBy: userId,
          lines,
        });

    if (status === 'posted') {
      await result.journalEntry.update(
        {
          status: 'posted',
          postedAt: new Date(),
          postedBy: userId,
        },
        {
          allowPostedJournalEntryMutation: true,
        },
      );
    }

    return result.journalEntry;
  }

  function getBwa({
    year = 2026,
    toMonth = 4,
  } = {}) {
    return request(app)
      .get(
        `/api/reports/bwa?year=${year}&toMonth=${toMonth}`,
      )
      .set(
        'Authorization',
        `Bearer ${accountant.token}`,
      )
      .set(
        'x-company-id',
        String(company.id),
      );
  }

  it('returns an empty company-scoped BWA read model without writes', async () => {
    const beforeEntries =
      await JournalEntry.count({
        where: {
          companyId: company.id,
        },
      });

    const beforeLines =
      await JournalEntryLine.count({
        where: {
          companyId: company.id,
        },
      });

    const response = await getBwa({
      year: 2026,
      toMonth: 1,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(response.body.report).toEqual(
      expect.objectContaining({
        companyId: company.id,
        preliminary: true,
        period: expect.objectContaining({
          year: 2026,
          toMonth: 1,
          from: '2026-01-01',
          to: '2026-01-31',
        }),
        months: ['2026-01'],
        rows: expect.any(Array),
        unmappedAccounts: [],
        warnings: [],
        evidence: [],
      }),
    );

    expect(
      response.body.report.rows.length,
    ).toBeGreaterThan(0);

    for (
      const row of response.body.report.rows
    ) {
      expect(row.monthlyValues).toEqual({
        '2026-01': 0,
      });

      expect(row.ytdValue).toBe(0);
    }

    const afterEntries =
      await JournalEntry.count({
        where: {
          companyId: company.id,
        },
      });

    const afterLines =
      await JournalEntryLine.count({
        where: {
          companyId: company.id,
        },
      });

    expect(afterEntries).toBe(beforeEntries);
    expect(afterLines).toBe(beforeLines);
  });

  it('reads posted same-company revenue and expense while excluding drafts and other companies', async () => {
    await createEntry({
      entryDate: '2026-01-15',
      sourceType: 'invoice',
      sourceId: 'invoice-posted',
      lines: [
        {
          accountId: payableAccount.id,
          debit: 1000,
          credit: 0,
        },
        {
          accountId: revenueAccount.id,
          debit: 0,
          credit: 1000,
        },
      ],
    });

    await createEntry({
      entryDate: '2026-02-15',
      sourceType: 'expense',
      sourceId: 'expense-posted',
      lines: [
        {
          accountId: expenseAccount.id,
          debit: 300,
          credit: 0,
        },
        {
          accountId: payableAccount.id,
          debit: 0,
          credit: 300,
        },
      ],
    });

    await createEntry({
      entryDate: '2026-03-15',
      sourceType: 'invoice',
      sourceId: 'invoice-draft',
      status: 'draft',
      lines: [
        {
          accountId: payableAccount.id,
          debit: 9999,
          credit: 0,
        },
        {
          accountId: revenueAccount.id,
          debit: 0,
          credit: 9999,
        },
      ],
    });

    const otherRevenueAccount =
      await ChartAccount.create({
        companyId: otherCompany.id,
        code: '8400',
        name: 'Other Revenue',
        type: 'revenue',
        normalBalance: 'credit',
        metadata: {
          role: 'revenue_19',
          kontenrahmen: 'SKR03',
        },
      });

    const otherPayableAccount =
      await ChartAccount.create({
        companyId: otherCompany.id,
        code: '1600',
        name: 'Other Payables',
        type: 'liability',
        normalBalance: 'credit',
        metadata: {
          role: 'accounts_payable',
          kontenrahmen: 'SKR03',
        },
      });

    const otherUser =
      await testUtils.createTestUserAndLogin({
        role: 'accountant',
        companyId: otherCompany.id,
      });

    await createEntry({
      companyId: otherCompany.id,
      userId: otherUser.user.id,
      entryDate: '2026-01-20',
      sourceType: 'invoice',
      sourceId: 'other-company-invoice',
      lines: [
        {
          accountId: otherPayableAccount.id,
          debit: 5000,
          credit: 0,
        },
        {
          accountId: otherRevenueAccount.id,
          debit: 0,
          credit: 5000,
        },
      ],
    });

    const response = await getBwa({
      year: 2026,
      toMonth: 3,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const report = response.body.report;

    expect(report.companyId).toBe(company.id);
    expect(report.period).toEqual(
      expect.objectContaining({
        year: 2026,
        toMonth: 3,
        from: '2026-01-01',
        to: '2026-03-31',
      }),
    );

    expect(
      JSON.stringify(report),
    ).not.toContain('9999');

    expect(
      JSON.stringify(report),
    ).not.toContain('5000');

    expect(report.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: revenueAccount.id,
          accountCode: '8400',
          month: '2026-01',
          amount: 1000,
          sourceType: 'invoice',
          sourceId: 'invoice-posted',
        }),
        expect.objectContaining({
          accountId: expenseAccount.id,
          accountCode: '4930',
          month: '2026-02',
          amount: 300,
          sourceType: 'expense',
          sourceId: 'expense-posted',
        }),
      ]),
    );

    expect(
      report.evidence.some(
        (item) =>
          item.sourceId === 'invoice-draft',
      ),
    ).toBe(false);

    expect(
      report.evidence.some(
        (item) =>
          item.sourceId ===
          'other-company-invoice',
      ),
    ).toBe(false);
  });

  it('places a real compensating reversal into the reversal month', async () => {
    const original = await createEntry({
      entryDate: '2026-03-10',
      sourceType: 'expense',
      sourceId: 'expense-to-reverse',
      lines: [
        {
          accountId: expenseAccount.id,
          debit: 200,
          credit: 0,
        },
        {
          accountId: payableAccount.id,
          debit: 0,
          credit: 200,
        },
      ],
    });

    const reversal =
      await accountingPostingService
        .reverseJournalEntry({
          journalEntryId: original.id,
          companyId: company.id,
          reversedBy: accountant.user.id,
        });

    await reversal.reversalEntry.update(
      {
        entryDate: '2026-04-10',
      },
      {
        allowPostedJournalEntryMutation: true,
      },
    );

    const response = await getBwa({
      year: 2026,
      toMonth: 4,
    });

    expect(response.status).toBe(200);

    const evidence =
      response.body.report.evidence.filter(
        (item) =>
          item.accountId === expenseAccount.id,
      );

    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          month: '2026-03',
          amount: 200,
          journalEntryId: original.id,
          sourceType: 'expense',
          sourceId: 'expense-to-reverse',
        }),
        expect.objectContaining({
          month: '2026-04',
          amount: -200,
          journalEntryId:
            reversal.reversalEntry.id,
          sourceType: 'journal_reversal',
          sourceId: String(original.id),
        }),
      ]),
    );

    const total = evidence.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    expect(total).toBe(0);
  });

  it('reports unmapped profit-and-loss accounts without hiding their evidence', async () => {
    await createEntry({
      entryDate: '2026-02-20',
      sourceType: 'expense',
      sourceId: 'unmapped-expense',
      lines: [
        {
          accountId:
            unmappedExpenseAccount.id,
          debit: 75,
          credit: 0,
        },
        {
          accountId: payableAccount.id,
          debit: 0,
          credit: 75,
        },
      ],
    });

    const response = await getBwa({
      year: 2026,
      toMonth: 2,
    });

    expect(response.status).toBe(200);

    const report = response.body.report;

    expect(report.unmappedAccounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId:
            unmappedExpenseAccount.id,
          accountCode: '6999',
          accountType: 'expense',
        }),
      ]),
    );

    expect(report.warnings.length).toBeGreaterThan(0);

    expect(report.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId:
            unmappedExpenseAccount.id,
          accountCode: '6999',
          amount: 75,
          sourceId: 'unmapped-expense',
        }),
      ]),
    );
  });
});
