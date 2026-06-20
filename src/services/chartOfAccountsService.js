'use strict';

const { ChartAccount, sequelize } = require('../models');

const DEFAULT_ACCOUNT_ROLES = Object.freeze({
  CASH_CLEARING: 'cash_clearing',
  BANK: 'bank',
  ACCOUNTS_RECEIVABLE: 'accounts_receivable',
  ACCOUNTS_PAYABLE: 'accounts_payable',
  INPUT_VAT_19: 'input_vat_19',
  OUTPUT_VAT_19: 'output_vat_19',
  REVENUE_19: 'revenue_19',
  REVENUE_7: 'revenue_7',
  GENERAL_EXPENSE: 'general_expense',
  RENT_EXPENSE: 'rent_expense',
  OTHER_OPERATING_EXPENSE: 'other_operating_expense',
});

const DEFAULT_CHART_ACCOUNTS = Object.freeze([
  {
    role: DEFAULT_ACCOUNT_ROLES.CASH_CLEARING,
    code: '1000',
    name: 'Cash / Clearing',
    type: 'asset',
    normalBalance: 'debit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.BANK,
    code: '1200',
    name: 'Bank',
    type: 'asset',
    normalBalance: 'debit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.ACCOUNTS_RECEIVABLE,
    code: '1400',
    name: 'Accounts receivable',
    type: 'asset',
    normalBalance: 'debit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.ACCOUNTS_PAYABLE,
    code: '1600',
    name: 'Accounts payable',
    type: 'liability',
    normalBalance: 'credit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.INPUT_VAT_19,
    code: '1576',
    name: 'Input VAT 19%',
    type: 'tax',
    normalBalance: 'debit',
    taxCategory: 'input_vat',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.OUTPUT_VAT_19,
    code: '1776',
    name: 'Output VAT 19%',
    type: 'tax',
    normalBalance: 'credit',
    taxCategory: 'output_vat',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.REVENUE_19,
    code: '8400',
    name: 'Revenue 19%',
    type: 'revenue',
    normalBalance: 'credit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.REVENUE_7,
    code: '8300',
    name: 'Revenue 7%',
    type: 'revenue',
    normalBalance: 'credit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.GENERAL_EXPENSE,
    code: '4930',
    name: 'General expenses',
    type: 'expense',
    normalBalance: 'debit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.RENT_EXPENSE,
    code: '4210',
    name: 'Rent expenses',
    type: 'expense',
    normalBalance: 'debit',
  },
  {
    role: DEFAULT_ACCOUNT_ROLES.OTHER_OPERATING_EXPENSE,
    code: '4980',
    name: 'Other operating expenses',
    type: 'expense',
    normalBalance: 'debit',
  },
]);

const normalizeRole = (role) => String(role || '').trim().toLowerCase();
const normalizeCode = (code) => String(code || '').trim();

const buildAccountMetadata = (definition) => ({
  ...(definition.metadata || {}),
  role: definition.role,
  source: 'default_chart_of_accounts',
  kontenrahmen: 'SKR03',
});

const findDefaultAccountDefinitionByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return DEFAULT_CHART_ACCOUNTS.find((account) => account.role === normalizedRole) || null;
};

const findDefaultAccountDefinitionByCode = (code) => {
  const normalizedCode = normalizeCode(code);
  return DEFAULT_CHART_ACCOUNTS.find((account) => account.code === normalizedCode) || null;
};

const ensureDefaultChartOfAccounts = async ({ companyId, transaction = null } = {}) => {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  return sequelize.transaction({ transaction }, async (t) => {
    const createdOrExisting = [];

    for (const definition of DEFAULT_CHART_ACCOUNTS) {
      const [account] = await ChartAccount.findOrCreate({
        where: {
          companyId,
          code: definition.code,
        },
        defaults: {
          companyId,
          code: definition.code,
          name: definition.name,
          type: definition.type,
          normalBalance: definition.normalBalance,
          taxCategory: definition.taxCategory || null,
          isSystem: true,
          isActive: true,
          metadata: buildAccountMetadata(definition),
        },
        transaction: t,
      });

      createdOrExisting.push(account);
    }

    return createdOrExisting;
  });
};

const getAccountByRole = async ({ companyId, role, createIfMissing = true, transaction = null } = {}) => {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const definition = findDefaultAccountDefinitionByRole(role);
  if (!definition) {
    throw new Error(`Unknown account role: ${role}`);
  }

  if (createIfMissing) {
    await ensureDefaultChartOfAccounts({ companyId, transaction });
  }

  const account = await ChartAccount.findOne({
    where: {
      companyId,
      code: definition.code,
      isActive: true,
    },
    transaction,
  });

  if (!account) {
    throw new Error(`Account for role ${role} is missing or inactive`);
  }

  return account;
};

const getAccountByCode = async ({ companyId, code, transaction = null } = {}) => {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) {
    throw new Error('account code is required');
  }

  const account = await ChartAccount.findOne({
    where: {
      companyId,
      code: normalizedCode,
      isActive: true,
    },
    transaction,
  });

  if (!account) {
    throw new Error(`Account ${normalizedCode} is missing or inactive`);
  }

  return account;
};

module.exports = {
  DEFAULT_ACCOUNT_ROLES,
  DEFAULT_CHART_ACCOUNTS,
  ensureDefaultChartOfAccounts,
  getAccountByRole,
  getAccountByCode,
  findDefaultAccountDefinitionByRole,
  findDefaultAccountDefinitionByCode,
};
