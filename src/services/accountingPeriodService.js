'use strict';

const { Op } = require('sequelize');

const getAccountingPeriodModel = () => {
  const { AccountingPeriod } = require('../models');

  if (!AccountingPeriod) {
    throw new Error('AccountingPeriod model is not registered');
  }

  return AccountingPeriod;
};

const normalizeDateOnly = (value) => {
  if (!value) {
    throw new Error('accountingDate is required');
  }

  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) {
      return match[0];
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('accountingDate must be a valid date');
  }

  return date.toISOString().slice(0, 10);
};

const buildLockedPeriodError = ({ accountingDate, period }) => {
  const error = new Error(
    `Accounting period is closed for ${accountingDate}. Use a correction or reversal in an open period.`,
  );
  error.code = 'ACCOUNTING_PERIOD_CLOSED';
  error.status = 409;
  error.details = {
    accountingDate,
    accountingPeriodId: period.id,
    periodStartDate: period.startDate,
    periodEndDate: period.endDate,
  };
  return error;
};

const findClosedPeriod = async ({ companyId, accountingDate, transaction = null } = {}) => {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const normalizedDate = normalizeDateOnly(accountingDate);
  const AccountingPeriod = getAccountingPeriodModel();

  return AccountingPeriod.findOne({
    where: {
      companyId,
      status: 'CLOSED',
      startDate: { [Op.lte]: normalizedDate },
      endDate: { [Op.gte]: normalizedDate },
    },
    order: [['startDate', 'DESC']],
    transaction,
  });
};

const assertAccountingDateOpen = async ({ companyId, accountingDate, transaction = null } = {}) => {
  const normalizedDate = normalizeDateOnly(accountingDate);
  const period = await findClosedPeriod({
    companyId,
    accountingDate: normalizedDate,
    transaction,
  });

  if (period) {
    throw buildLockedPeriodError({ accountingDate: normalizedDate, period });
  }

  return true;
};

const closePeriod = async ({
  companyId,
  startDate,
  endDate,
  userId = null,
  reason = null,
  transaction = null,
} = {}) => {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const normalizedStartDate = normalizeDateOnly(startDate);
  const normalizedEndDate = normalizeDateOnly(endDate);

  if (normalizedStartDate > normalizedEndDate) {
    throw new Error('startDate must be before or equal to endDate');
  }

  const AccountingPeriod = getAccountingPeriodModel();

  const [period] = await AccountingPeriod.findOrCreate({
    where: {
      companyId,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    },
    defaults: {
      companyId,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: userId,
      reason,
    },
    transaction,
  });

  if (period.status !== 'CLOSED') {
    await period.update(
      {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: userId,
        reopenedAt: null,
        reopenedBy: null,
        reason,
      },
      { transaction },
    );
  }

  return period;
};

const reopenPeriod = async ({ periodId, companyId, userId = null, reason = null, transaction = null } = {}) => {
  if (!periodId) {
    throw new Error('periodId is required');
  }
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const AccountingPeriod = getAccountingPeriodModel();

  const period = await AccountingPeriod.findOne({
    where: { id: periodId, companyId },
    transaction,
  });

  if (!period) {
    const error = new Error('Accounting period not found');
    error.code = 'ACCOUNTING_PERIOD_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  await period.update(
    {
      status: 'OPEN',
      reopenedAt: new Date(),
      reopenedBy: userId,
      reason,
    },
    { transaction },
  );

  return period;
};

module.exports = {
  normalizeDateOnly,
  findClosedPeriod,
  assertAccountingDateOpen,
  closePeriod,
  reopenPeriod,
};
