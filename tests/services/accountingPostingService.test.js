'use strict';

const {
  ChartAccount,
  Company,
  JournalEntry,
  JournalEntryLine,
  User,
  sequelize,
} = require('../../src/models');
const accountingPostingService = require('../../src/services/accountingPostingService');

describe('accountingPostingService', () => {
  let company;
  let otherCompany;
  let user;
  let expenseAccount;
  let inputVatAccount;
  let payableAccount;
  let otherCompanyAccount;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await JournalEntryLine.destroy({ where: {}, force: true });
    await JournalEntry.destroy({ where: {}, force: true });
    await ChartAccount.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    await Company.destroy({ where: {}, force: true });

    company = await Company.create({
      name: 'Posting Test GmbH',
      taxId: `POST-${Date.now()}-${Math.random()}`,
      address: 'Teststr. 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
    });

    otherCompany = await Company.create({
      name: 'Other Posting GmbH',
      taxId: `OTHER-${Date.now()}-${Math.random()}`,
      address: 'Otherstr. 1',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'DE',
    });

    user = await User.create({
      email: `posting-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashed-password',
      firstName: 'Posting',
      lastName: 'Tester',
      role: 'accountant',
      companyId: company.id,
    });

    expenseAccount = await ChartAccount.create({
      companyId: company.id,
      code: '4930',
      name: 'Office expenses',
      type: 'expense',
      normalBalance: 'debit',
      isSystem: true,
    });

    inputVatAccount = await ChartAccount.create({
      companyId: company.id,
      code: '1576',
      name: 'Input VAT 19%',
      type: 'tax',
      normalBalance: 'debit',
      taxCategory: 'input_vat',
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

    otherCompanyAccount = await ChartAccount.create({
      companyId: otherCompany.id,
      code: '4930',
      name: 'Other company expenses',
      type: 'expense',
      normalBalance: 'debit',
      isSystem: true,
    });
  });
  it('normalizes monetary values to two decimals', () => {
    expect(accountingPostingService.normalizeMoney('10.235')).toBe(10.23);
    expect(accountingPostingService.normalizeMoney(10.236)).toBe(10.24);
    expect(accountingPostingService.normalizeMoney(null)).toBe(0);
  });

  it('rejects invalid monetary values', () => {
    expect(() => accountingPostingService.normalizeMoney('not-a-number')).toThrow(
      /invalid monetary amount/i,
    );
  });

  it('validates a balanced journal entry', () => {
    const result = accountingPostingService.validateBalancedEntry([
      { accountId: expenseAccount.id, debit: 100, credit: 0 },
      { accountId: inputVatAccount.id, debit: 19, credit: 0 },
      { accountId: payableAccount.id, debit: 0, credit: 119 },
    ]);

    expect(result).toEqual({
      balanced: true,
      totalDebit: 119,
      totalCredit: 119,
    });
  });

  it('rejects an unbalanced journal entry', () => {
    expect(() =>
      accountingPostingService.validateBalancedEntry([
        { accountId: expenseAccount.id, debit: 100, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 99 },
      ]),
    ).toThrow(/not balanced/i);
  });

  it('rejects a line with both debit and credit', () => {
    expect(() =>
      accountingPostingService.validateBalancedEntry([
        { accountId: expenseAccount.id, debit: 100, credit: 1 },
        { accountId: payableAccount.id, debit: 0, credit: 101 },
      ]),
    ).toThrow(/both debit and credit/i);
  });

  it('rejects a line without debit or credit', () => {
    expect(() =>
      accountingPostingService.validateBalancedEntry([
        { accountId: expenseAccount.id, debit: 0, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 10 },
      ]),
    ).toThrow(/either debit or credit/i);
  });

  it('rejects negative debit or credit values', () => {
    expect(() =>
      accountingPostingService.validateBalancedEntry([
        { accountId: expenseAccount.id, debit: -1, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: -1 },
      ]),
    ).toThrow(/cannot be negative/i);
  });

  it('creates a draft journal entry with balanced lines', async () => {
    const result = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'expense',
      sourceId: 'expense-1',
      description: 'Reviewed expense draft posting preview',
      createdBy: user.id,
      lines: [
        { accountId: expenseAccount.id, debit: 100, credit: 0, description: 'Net expense' },
        {
          accountId: inputVatAccount.id,
          debit: 19,
          credit: 0,
          taxCode: 'input_vat_19',
          vatRate: 19,
          description: 'Input VAT',
        },
        { accountId: payableAccount.id, debit: 0, credit: 119, description: 'Payable' },
      ],
    });

    expect(result.journalEntry).toMatchObject({
      companyId: company.id,
      sourceType: 'expense',
      sourceId: 'expense-1',
      status: 'draft',
    });

    expect(result.journalEntry.lines).toHaveLength(3);

    const persistedLines = await JournalEntryLine.findAll({
      where: { journalEntryId: result.journalEntry.id, companyId: company.id },
    });

    expect(persistedLines).toHaveLength(3);
  });

  it('rejects accounts outside the active company', async () => {
    await expect(
      accountingPostingService.createJournalEntryDraft({
        companyId: company.id,
        entryDate: '2026-06-21',
        sourceType: 'expense',
        sourceId: 'expense-cross-company',
        createdBy: user.id,
        lines: [
          { accountId: otherCompanyAccount.id, debit: 100, credit: 0 },
          { accountId: payableAccount.id, debit: 0, credit: 100 },
        ],
      }),
    ).rejects.toThrow(/outside the active company/i);
  });
});
