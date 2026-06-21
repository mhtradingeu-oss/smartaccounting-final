'use strict';

const {
  ChartAccount,
  Company,
  Expense,
  JournalEntry,
  JournalEntryLine,
  AuditLog,
  User,
  sequelize,
} = require('../../src/models');
const accountingPostingService = require('../../src/services/accountingPostingService');
const chartOfAccountsService = require('../../src/services/chartOfAccountsService');

describe('accountingPostingService', () => {
  let company;
  let otherCompany;
  let user;
  let otherCompanyUser;
  let expenseAccount;
  let inputVatAccount;
  let payableAccount;
  let otherCompanyAccount;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await AuditLog.destroy({ where: {}, force: true });
    await JournalEntryLine.destroy({ where: {}, force: true });
    await JournalEntry.destroy({ where: {}, force: true });
    await Expense.destroy({ where: {}, force: true });
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

    otherCompanyUser = await User.create({
      email: `other-posting-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashed-password',
      firstName: 'Other',
      lastName: 'Tester',
      role: 'accountant',
      companyId: otherCompany.id,
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

  it('builds expense posting lines with input VAT', () => {
    const lines = accountingPostingService.buildExpensePostingLines({
      description: 'Hosting',
      vendorName: 'Hosting Vendor',
      netAmount: 100,
      vatRate: 0.19,
      vatAmount: 19,
      grossAmount: 119,
      currency: 'EUR',
    });

    expect(lines).toEqual([
      expect.objectContaining({
        accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.GENERAL_EXPENSE,
        debit: 100,
        credit: 0,
      }),
      expect.objectContaining({
        accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.INPUT_VAT_19,
        debit: 19,
        credit: 0,
        taxCode: 'input_vat_19',
      }),
      expect.objectContaining({
        accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.ACCOUNTS_PAYABLE,
        debit: 0,
        credit: 119,
      }),
    ]);

    expect(accountingPostingService.validateBalancedEntry(
      lines.map((line, index) => ({ ...line, accountId: index + 1 })),
    )).toEqual(expect.objectContaining({ balanced: true }));
  });

  it('builds restricted expense posting lines without input VAT', () => {
    const lines = accountingPostingService.buildExpensePostingLines({
      description: 'Taxi',
      vendorName: 'Taxi Berlin GmbH',
      netAmount: 119,
      vatRate: 0,
      vatAmount: 0,
      grossAmount: 119,
      currency: 'EUR',
      taxTreatment: 'no_vorsteuer_allowed',
      inputVatAllowed: false,
    });

    expect(lines).toEqual([
      expect.objectContaining({
        accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.GENERAL_EXPENSE,
        debit: 119,
        credit: 0,
      }),
      expect.objectContaining({
        accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.ACCOUNTS_PAYABLE,
        debit: 0,
        credit: 119,
      }),
    ]);

    expect(accountingPostingService.validateBalancedEntry(
      lines.map((line, index) => ({ ...line, accountId: index + 1 })),
    )).toEqual(expect.objectContaining({ balanced: true }));
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

  it('creates a draft journal entry using account roles', async () => {
    const result = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'expense',
      sourceId: 'expense-role-1',
      description: 'Posting draft using account roles',
      createdBy: user.id,
      lines: [
        {
          accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.GENERAL_EXPENSE,
          debit: 100,
          credit: 0,
          description: 'Net expense',
        },
        {
          accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.INPUT_VAT_19,
          debit: 19,
          credit: 0,
          taxCode: 'input_vat_19',
          vatRate: 19,
          description: 'Input VAT',
        },
        {
          accountRole: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.ACCOUNTS_PAYABLE,
          debit: 0,
          credit: 119,
          description: 'Payable',
        },
      ],
    });

    expect(result.journalEntry).toMatchObject({
      companyId: company.id,
      sourceType: 'expense',
      sourceId: 'expense-role-1',
      status: 'draft',
    });

    const persistedLines = await JournalEntryLine.findAll({
      where: { journalEntryId: result.journalEntry.id, companyId: company.id },
      include: [{ model: ChartAccount, as: 'account' }],
      order: [['createdAt', 'ASC']],
    });

    expect(persistedLines).toHaveLength(3);
    expect(persistedLines.map((line) => line.account.code).sort()).toEqual(['1576', '1600', '4930']);
  });

  it('creates an expense posting preview for a VAT expense', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      vendorName: 'Hosting Vendor',
      description: 'Hosting invoice',
      expenseDate: new Date('2026-06-21'),
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

    const result = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    expect(result.journalEntry).toMatchObject({
      companyId: company.id,
      sourceType: 'expense',
      sourceId: String(expense.id),
      status: 'draft',
    });

    expect(result.journalEntry.metadata).toEqual(
      expect.objectContaining({
        previewOnly: true,
        source: 'expense_posting_preview',
        expenseId: expense.id,
      }),
    );

    const lines = await JournalEntryLine.findAll({
      where: { journalEntryId: result.journalEntry.id },
      include: [{ model: ChartAccount, as: 'account' }],
    });

    expect(lines).toHaveLength(3);
    expect(lines.map((line) => line.account.code).sort()).toEqual(['1576', '1600', '4930']);

    await expense.reload();
    expect(expense.status).toBe('pending');
  });

  it('creates an expense posting preview without input VAT for restricted expense', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      vendorName: 'Taxi Berlin GmbH',
      description: 'Taxi receipt',
      expenseDate: new Date('2026-06-21'),
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

    const result = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    const lines = await JournalEntryLine.findAll({
      where: { journalEntryId: result.journalEntry.id },
      include: [{ model: ChartAccount, as: 'account' }],
    });

    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.account.code).sort()).toEqual(['1600', '4930']);
    expect(lines.reduce((sum, line) => sum + Number(line.debit), 0)).toBe(119);
    expect(lines.reduce((sum, line) => sum + Number(line.credit), 0)).toBe(119);
  });



  it('writes an audit log when creating an expense posting preview', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      category: 'office',
      vendorName: 'Audit Preview Vendor',
      description: 'Audit preview creation',
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

    const result = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    const auditLog = await AuditLog.findOne({
      where: {
        action: 'expense_posting_preview_created',
        resourceType: 'JournalEntry',
        resourceId: String(result.journalEntry.id),
        companyId: company.id,
        userId: user.id,
      },
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog.immutable).toBe(true);
    expect(auditLog.newValues).toEqual(
      expect.objectContaining({
        expenseId: expense.id,
        journalEntryId: result.journalEntry.id,
        previewOnly: true,
        reusedPreview: false,
        linesCount: 3,
      }),
    );
  });

  it('reuses an existing expense posting preview instead of duplicating it', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      category: 'office',
      vendorName: 'Duplicate Preview Vendor',
      description: 'Duplicate preview prevention',
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

    const first = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    const second = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    expect(first.reusedPreview).toBe(false);
    expect(second.reusedPreview).toBe(true);
    expect(second.journalEntry.id).toBe(first.journalEntry.id);

    const entries = await JournalEntry.findAll({
      where: {
        companyId: company.id,
        sourceType: 'expense',
        sourceId: String(expense.id),
        status: 'draft',
      },
    });

    const lines = await JournalEntryLine.findAll({
      where: {
        journalEntryId: first.journalEntry.id,
      },
    });

    expect(entries).toHaveLength(1);
    expect(lines).toHaveLength(3);
  });


  it('writes an audit log when reusing an existing expense posting preview', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      category: 'office',
      vendorName: 'Audit Reuse Preview Vendor',
      description: 'Audit preview reuse',
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

    const first = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    const second = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    expect(second.reusedPreview).toBe(true);
    expect(second.journalEntry.id).toBe(first.journalEntry.id);

    const auditLog = await AuditLog.findOne({
      where: {
        action: 'expense_posting_preview_reused',
        resourceType: 'JournalEntry',
        resourceId: String(first.journalEntry.id),
        companyId: company.id,
        userId: user.id,
      },
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog.immutable).toBe(true);
    expect(auditLog.newValues).toEqual(
      expect.objectContaining({
        expenseId: expense.id,
        journalEntryId: first.journalEntry.id,
        previewOnly: true,
        reusedPreview: true,
        linesCount: 3,
      }),
    );
  });


  it('finalizes an existing expense posting preview into a posted journal entry', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      category: 'office',
      vendorName: 'Final Posting Vendor',
      description: 'Final posting service test',
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

    const preview = await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    const result = await accountingPostingService.finalizeExpensePosting({
      expenseId: expense.id,
      companyId: company.id,
      postedBy: user.id,
    });

    expect(result.posted).toBe(true);
    expect(result.finalizedFromPreview).toBe(true);
    expect(result.journalEntry.id).toBe(preview.journalEntry.id);
    expect(result.journalEntry.status).toBe('posted');
    expect(result.journalEntry.postedBy).toBe(user.id);
    expect(result.journalEntry.postedAt).toBeTruthy();
    expect(result.lines).toHaveLength(3);

    await expense.reload();
    expect(expense.status).toBe('pending');

    const auditLog = await AuditLog.findOne({
      where: {
        action: 'expense_posting_finalized',
        resourceType: 'JournalEntry',
        resourceId: String(result.journalEntry.id),
        companyId: company.id,
        userId: user.id,
      },
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog.immutable).toBe(true);
    expect(auditLog.newValues).toEqual(
      expect.objectContaining({
        expenseId: expense.id,
        journalEntryId: result.journalEntry.id,
        status: 'posted',
        previewOnly: false,
        finalizedFromPreview: true,
        postedBy: user.id,
        linesCount: 3,
      }),
    );
  });

  it('rejects final expense posting when no preview exists', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      category: 'office',
      vendorName: 'No Preview Vendor',
      description: 'No preview final posting service test',
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

    await expect(
      accountingPostingService.finalizeExpensePosting({
        expenseId: expense.id,
        companyId: company.id,
        postedBy: user.id,
      }),
    ).rejects.toMatchObject({
      code: 'EXPENSE_POSTING_PREVIEW_REQUIRED',
      status: 409,
    });
  });

  it('prevents duplicate final expense posting', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      category: 'office',
      vendorName: 'Duplicate Final Posting Vendor',
      description: 'Duplicate final posting service test',
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

    await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    const first = await accountingPostingService.finalizeExpensePosting({
      expenseId: expense.id,
      companyId: company.id,
      postedBy: user.id,
    });

    expect(first.journalEntry.status).toBe('posted');

    await expect(
      accountingPostingService.finalizeExpensePosting({
        expenseId: expense.id,
        companyId: company.id,
        postedBy: user.id,
      }),
    ).rejects.toMatchObject({
      code: 'EXPENSE_POSTING_ALREADY_FINALIZED',
      status: 409,
    });

    const entries = await JournalEntry.findAll({
      where: {
        companyId: company.id,
        sourceType: 'expense',
        sourceId: String(expense.id),
      },
    });

    expect(entries).toHaveLength(1);
  });



  it('reverses a posted journal entry with compensating lines', async () => {
    const expense = await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      date: new Date('2026-06-21'),
      category: 'office',
      vendorName: 'Reversal Vendor',
      description: 'Reversal service test',
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

    await accountingPostingService.createExpensePostingPreview({
      expenseId: expense.id,
      companyId: company.id,
      createdBy: user.id,
    });

    const posted = await accountingPostingService.finalizeExpensePosting({
      expenseId: expense.id,
      companyId: company.id,
      postedBy: user.id,
    });

    const result = await accountingPostingService.reverseJournalEntry({
      journalEntryId: posted.journalEntry.id,
      companyId: company.id,
      reversedBy: user.id,
    });

    expect(result.reversed).toBe(true);
    expect(result.originalEntry.id).toBe(posted.journalEntry.id);
    expect(result.originalEntry.reversedAt).toBeTruthy();

    expect(result.reversalEntry).toEqual(
      expect.objectContaining({
        companyId: company.id,
        status: 'posted',
        sourceType: 'journal_reversal',
        sourceId: String(posted.journalEntry.id),
        reversalOfId: posted.journalEntry.id,
        postedBy: user.id,
      }),
    );

    const originalLines = await JournalEntryLine.findAll({
      where: { journalEntryId: posted.journalEntry.id },
      order: [['createdAt', 'ASC']],
    });

    const reversalLines = await JournalEntryLine.findAll({
      where: { journalEntryId: result.reversalEntry.id },
      order: [['createdAt', 'ASC']],
    });

    expect(reversalLines).toHaveLength(originalLines.length);

    originalLines.forEach((line) => {
      const matching = reversalLines.find(
        (reversalLine) => reversalLine.accountId === line.accountId
          && Number(reversalLine.debit) === Number(line.credit)
          && Number(reversalLine.credit) === Number(line.debit),
      );
      expect(matching).toBeTruthy();
    });

    const auditLog = await AuditLog.findOne({
      where: {
        action: 'journal_entry_reversed',
        resourceType: 'JournalEntry',
        resourceId: String(posted.journalEntry.id),
        companyId: company.id,
        userId: user.id,
      },
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog.immutable).toBe(true);
    expect(auditLog.newValues).toEqual(
      expect.objectContaining({
        journalEntryId: posted.journalEntry.id,
        reversalJournalEntryId: result.reversalEntry.id,
        reversalOfId: posted.journalEntry.id,
        reversedBy: user.id,
        linesCount: 3,
      }),
    );
  });

  it('rejects reversing a draft journal entry', async () => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'draft-reversal-test',
      createdBy: user.id,
      lines: [
        { accountId: expenseAccount.id, debit: 100, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 100 },
      ],
    });

    await expect(
      accountingPostingService.reverseJournalEntry({
        journalEntryId: draft.journalEntry.id,
        companyId: company.id,
        reversedBy: user.id,
      }),
    ).rejects.toMatchObject({
      code: 'JOURNAL_ENTRY_NOT_POSTED',
      status: 409,
    });
  });

  it('prevents duplicate journal entry reversals', async () => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId: company.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'duplicate-reversal-test',
      createdBy: user.id,
      lines: [
        { accountId: expenseAccount.id, debit: 100, credit: 0 },
        { accountId: payableAccount.id, debit: 0, credit: 100 },
      ],
    });

    await draft.journalEntry.update({
      status: 'posted',
      postedAt: new Date(),
      postedBy: user.id,
    });

    const first = await accountingPostingService.reverseJournalEntry({
      journalEntryId: draft.journalEntry.id,
      companyId: company.id,
      reversedBy: user.id,
    });

    expect(first.reversalEntry.reversalOfId).toBe(draft.journalEntry.id);

    await expect(
      accountingPostingService.reverseJournalEntry({
        journalEntryId: draft.journalEntry.id,
        companyId: company.id,
        reversedBy: user.id,
      }),
    ).rejects.toMatchObject({
      code: 'JOURNAL_ENTRY_ALREADY_REVERSED',
      status: 409,
    });
  });

  it('rejects reversing journal entries across company boundary', async () => {
    const draft = await accountingPostingService.createJournalEntryDraft({
      companyId: otherCompany.id,
      entryDate: '2026-06-21',
      sourceType: 'manual',
      sourceId: 'cross-company-reversal-test',
      createdBy: otherCompanyUser.id,
      lines: [
        { accountId: otherCompanyAccount.id, debit: 100, credit: 0 },
        { accountId: otherCompanyAccount.id, debit: 0, credit: 100 },
      ],
    });

    await draft.journalEntry.update({
      status: 'posted',
      postedAt: new Date(),
      postedBy: otherCompanyUser.id,
    });

    await expect(
      accountingPostingService.reverseJournalEntry({
        journalEntryId: draft.journalEntry.id,
        companyId: company.id,
        reversedBy: user.id,
      }),
    ).rejects.toMatchObject({
      code: 'JOURNAL_ENTRY_NOT_FOUND',
      status: 404,
    });
  });


  it('rejects expense posting preview across company boundary', async () => {
    const expense = await Expense.create({
      companyId: otherCompany.id,
      userId: otherCompanyUser.id,
      createdByUserId: otherCompanyUser.id,
      date: new Date('2026-06-21'),
      vendorName: 'Other Vendor',
      description: 'Other expense',
      expenseDate: new Date('2026-06-21'),
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

    await expect(
      accountingPostingService.createExpensePostingPreview({
        expenseId: expense.id,
        companyId: company.id,
        createdBy: user.id,
      }),
    ).rejects.toThrow(/expense not found/i);
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
