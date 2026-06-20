'use strict';

const { ChartAccount, Company, JournalEntryLine, JournalEntry, User, sequelize } = require('../../src/models');
const chartOfAccountsService = require('../../src/services/chartOfAccountsService');

describe('chartOfAccountsService', () => {
  let company;
  let otherCompany;

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
      name: 'Chart Test GmbH',
      taxId: `CHART-${Date.now()}-${Math.random()}`,
      address: 'Chartstr. 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
    });

    otherCompany = await Company.create({
      name: 'Other Chart GmbH',
      taxId: `OTHER-CHART-${Date.now()}-${Math.random()}`,
      address: 'Otherstr. 1',
      city: 'Hamburg',
      postalCode: '20095',
      country: 'DE',
    });
  });

  it('defines the default chart of accounts roles', () => {
    expect(chartOfAccountsService.DEFAULT_ACCOUNT_ROLES).toEqual(
      expect.objectContaining({
        INPUT_VAT_19: 'input_vat_19',
        OUTPUT_VAT_19: 'output_vat_19',
        ACCOUNTS_PAYABLE: 'accounts_payable',
        ACCOUNTS_RECEIVABLE: 'accounts_receivable',
        GENERAL_EXPENSE: 'general_expense',
        REVENUE_19: 'revenue_19',
      }),
    );

    expect(chartOfAccountsService.DEFAULT_CHART_ACCOUNTS.length).toBeGreaterThanOrEqual(10);
  });

  it('creates default chart accounts for a company', async () => {
    const accounts = await chartOfAccountsService.ensureDefaultChartOfAccounts({
      companyId: company.id,
    });

    expect(accounts).toHaveLength(chartOfAccountsService.DEFAULT_CHART_ACCOUNTS.length);

    const persisted = await ChartAccount.findAll({ where: { companyId: company.id } });
    expect(persisted).toHaveLength(chartOfAccountsService.DEFAULT_CHART_ACCOUNTS.length);

    const inputVat = persisted.find((account) => account.code === '1576');
    expect(inputVat).toMatchObject({
      companyId: company.id,
      name: 'Input VAT 19%',
      type: 'tax',
      normalBalance: 'debit',
      taxCategory: 'input_vat',
      isSystem: true,
      isActive: true,
    });
    expect(inputVat.metadata).toEqual(
      expect.objectContaining({
        role: 'input_vat_19',
        source: 'default_chart_of_accounts',
        kontenrahmen: 'SKR03',
      }),
    );
  });

  it('is idempotent and does not duplicate accounts', async () => {
    await chartOfAccountsService.ensureDefaultChartOfAccounts({ companyId: company.id });
    await chartOfAccountsService.ensureDefaultChartOfAccounts({ companyId: company.id });

    const count = await ChartAccount.count({ where: { companyId: company.id } });
    expect(count).toBe(chartOfAccountsService.DEFAULT_CHART_ACCOUNTS.length);
  });

  it('keeps chart accounts scoped per company', async () => {
    await chartOfAccountsService.ensureDefaultChartOfAccounts({ companyId: company.id });
    await chartOfAccountsService.ensureDefaultChartOfAccounts({ companyId: otherCompany.id });

    const companyCount = await ChartAccount.count({ where: { companyId: company.id } });
    const otherCompanyCount = await ChartAccount.count({ where: { companyId: otherCompany.id } });

    expect(companyCount).toBe(chartOfAccountsService.DEFAULT_CHART_ACCOUNTS.length);
    expect(otherCompanyCount).toBe(chartOfAccountsService.DEFAULT_CHART_ACCOUNTS.length);
  });

  it('resolves an account by role and creates defaults if missing', async () => {
    const account = await chartOfAccountsService.getAccountByRole({
      companyId: company.id,
      role: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.ACCOUNTS_PAYABLE,
    });

    expect(account).toMatchObject({
      companyId: company.id,
      code: '1600',
      name: 'Accounts payable',
      type: 'liability',
    });

    const count = await ChartAccount.count({ where: { companyId: company.id } });
    expect(count).toBe(chartOfAccountsService.DEFAULT_CHART_ACCOUNTS.length);
  });

  it('resolves an account by code only inside the active company', async () => {
    await chartOfAccountsService.ensureDefaultChartOfAccounts({ companyId: company.id });
    await chartOfAccountsService.ensureDefaultChartOfAccounts({ companyId: otherCompany.id });

    const account = await chartOfAccountsService.getAccountByCode({
      companyId: company.id,
      code: '8400',
    });

    expect(account.companyId).toBe(company.id);
    expect(account.code).toBe('8400');
    expect(account.name).toBe('Revenue 19%');
  });

  it('rejects unknown account roles', async () => {
    await expect(
      chartOfAccountsService.getAccountByRole({
        companyId: company.id,
        role: 'unknown_role',
      }),
    ).rejects.toThrow(/unknown account role/i);
  });

  it('rejects missing inactive account when createIfMissing is false', async () => {
    await expect(
      chartOfAccountsService.getAccountByRole({
        companyId: company.id,
        role: chartOfAccountsService.DEFAULT_ACCOUNT_ROLES.INPUT_VAT_19,
        createIfMissing: false,
      }),
    ).rejects.toThrow(/missing or inactive/i);
  });
});
