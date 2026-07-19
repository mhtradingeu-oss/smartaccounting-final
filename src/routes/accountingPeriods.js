'use strict';

const express = require('express');
const { Op } = require('sequelize');

const { AccountingPeriod, sequelize } = require('../models');
const { requireCompany, requireRole } = require('../middleware/authMiddleware');
const {
  closePeriod,
  reopenPeriod,
} = require('../services/accountingPeriodService');
const AuditLogService = require('../services/auditLogService');
const ApiError = require('../lib/errors/apiError');

const router = express.Router();

router.use(requireCompany);

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const requireReason = (value) => {
  const reason = typeof value === 'string' ? value.trim() : '';

  if (!reason) {
    throw new ApiError(
      400,
      'ACCOUNTING_PERIOD_REASON_REQUIRED',
      'A documented reason is required',
    );
  }

  return reason;
};

const validateDateRange = ({ startDate, endDate }) => {
  if (!isValidDateOnly(startDate)) {
    throw new ApiError(
      400,
      'ACCOUNTING_PERIOD_START_DATE_INVALID',
      'startDate must be a valid date in YYYY-MM-DD format',
    );
  }

  if (!isValidDateOnly(endDate)) {
    throw new ApiError(
      400,
      'ACCOUNTING_PERIOD_END_DATE_INVALID',
      'endDate must be a valid date in YYYY-MM-DD format',
    );
  }

  if (startDate > endDate) {
    throw new ApiError(
      400,
      'ACCOUNTING_PERIOD_RANGE_INVALID',
      'startDate must be before or equal to endDate',
    );
  }
};

const parsePeriodId = (value) => {
  const periodId = Number(value);

  if (!Number.isInteger(periodId) || periodId <= 0) {
    throw new ApiError(
      400,
      'ACCOUNTING_PERIOD_ID_INVALID',
      'Accounting period id must be a positive integer',
    );
  }

  return periodId;
};

const serializePeriod = (period) => {
  if (!period) {
    return null;
  }

  return typeof period.toJSON === 'function' ? period.toJSON() : period;
};

router.get(
  '/',
  requireRole(['viewer']),
  async (req, res, next) => {
    try {
      const where = {
        companyId: req.companyId,
      };

      if (req.query.status) {
        const status = String(req.query.status).toUpperCase();

        if (!['OPEN', 'CLOSED'].includes(status)) {
          throw new ApiError(
            400,
            'ACCOUNTING_PERIOD_STATUS_INVALID',
            'status must be OPEN or CLOSED',
          );
        }

        where.status = status;
      }

      if (req.query.from || req.query.to) {
        where[Op.and] = [];

        if (req.query.from) {
          const from = String(req.query.from);

          if (!isValidDateOnly(from)) {
            throw new ApiError(
              400,
              'ACCOUNTING_PERIOD_FROM_DATE_INVALID',
              'from must be a valid date in YYYY-MM-DD format',
            );
          }

          where[Op.and].push({
            endDate: {
              [Op.gte]: from,
            },
          });
        }

        if (req.query.to) {
          const to = String(req.query.to);

          if (!isValidDateOnly(to)) {
            throw new ApiError(
              400,
              'ACCOUNTING_PERIOD_TO_DATE_INVALID',
              'to must be a valid date in YYYY-MM-DD format',
            );
          }

          where[Op.and].push({
            startDate: {
              [Op.lte]: to,
            },
          });
        }
      }

      const periods = await AccountingPeriod.findAll({
        where,
        order: [
          ['startDate', 'DESC'],
          ['endDate', 'DESC'],
          ['id', 'DESC'],
        ],
      });

      return res.status(200).json({
        success: true,
        accountingPeriods: periods.map(serializePeriod),
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/close',
  requireRole(['accountant']),
  async (req, res, next) => {
    try {
      const startDate = String(req.body?.startDate || '');
      const endDate = String(req.body?.endDate || '');
      const reason = requireReason(req.body?.reason);

      validateDateRange({
        startDate,
        endDate,
      });

      const period = await sequelize.transaction(async (transaction) => {
        const overlappingPeriod = await AccountingPeriod.findOne({
          where: {
            companyId: req.companyId,
            startDate: {
              [Op.lte]: endDate,
            },
            endDate: {
              [Op.gte]: startDate,
            },
            [Op.not]: {
              startDate,
              endDate,
            },
          },
          transaction,
        });

        if (overlappingPeriod) {
          throw new ApiError(
            409,
            'ACCOUNTING_PERIOD_OVERLAP',
            'The requested accounting period overlaps an existing period',
            {
              accountingPeriodId: overlappingPeriod.id,
              startDate: overlappingPeriod.startDate,
              endDate: overlappingPeriod.endDate,
              status: overlappingPeriod.status,
            },
          );
        }

        const existingPeriod = await AccountingPeriod.findOne({
          where: {
            companyId: req.companyId,
            startDate,
            endDate,
          },
          transaction,
        });

        const before = existingPeriod
          ? {
              status: existingPeriod.status,
              startDate: existingPeriod.startDate,
              endDate: existingPeriod.endDate,
              closedAt: existingPeriod.closedAt,
              closedBy: existingPeriod.closedBy,
              reopenedAt: existingPeriod.reopenedAt,
              reopenedBy: existingPeriod.reopenedBy,
              reason: existingPeriod.reason,
            }
          : null;

        const closedPeriod = await closePeriod({
          companyId: req.companyId,
          startDate,
          endDate,
          userId: req.user.id,
          reason,
          transaction,
        });

        await AuditLogService.appendEntry({
          action: 'ACCOUNTING_PERIOD_CLOSED',
          resourceType: 'AccountingPeriod',
          resourceId: String(closedPeriod.id),
          userId: req.user.id,
          oldValues: before,
          newValues: {
            status: closedPeriod.status,
            startDate: closedPeriod.startDate,
            endDate: closedPeriod.endDate,
            closedAt: closedPeriod.closedAt,
            closedBy: closedPeriod.closedBy,
            reason,
          },
          reason,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          transaction,
        });

        return closedPeriod;
      });

      return res.status(200).json({
        success: true,
        message: 'Accounting period closed successfully',
        accountingPeriod: serializePeriod(period),
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/:periodId/reopen',
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const periodId = parsePeriodId(req.params.periodId);
      const reason = requireReason(req.body?.reason);

      const period = await sequelize.transaction(async (transaction) => {
        const existingPeriod = await AccountingPeriod.findOne({
          where: {
            id: periodId,
            companyId: req.companyId,
          },
          transaction,
        });

        if (!existingPeriod) {
          throw new ApiError(
            404,
            'ACCOUNTING_PERIOD_NOT_FOUND',
            'Accounting period not found',
          );
        }

        if (existingPeriod.status !== 'CLOSED') {
          throw new ApiError(
            409,
            'ACCOUNTING_PERIOD_NOT_CLOSED',
            'Only a closed accounting period can be reopened',
          );
        }

        const before = {
          status: existingPeriod.status,
          startDate: existingPeriod.startDate,
          endDate: existingPeriod.endDate,
          closedAt: existingPeriod.closedAt,
          closedBy: existingPeriod.closedBy,
          reopenedAt: existingPeriod.reopenedAt,
          reopenedBy: existingPeriod.reopenedBy,
          reason: existingPeriod.reason,
        };

        const reopenedPeriod = await reopenPeriod({
          periodId,
          companyId: req.companyId,
          userId: req.user.id,
          reason,
          transaction,
        });

        await AuditLogService.appendEntry({
          action: 'ACCOUNTING_PERIOD_REOPENED',
          resourceType: 'AccountingPeriod',
          resourceId: String(reopenedPeriod.id),
          userId: req.user.id,
          oldValues: before,
          newValues: {
            status: reopenedPeriod.status,
            startDate: reopenedPeriod.startDate,
            endDate: reopenedPeriod.endDate,
            reopenedAt: reopenedPeriod.reopenedAt,
            reopenedBy: reopenedPeriod.reopenedBy,
            reason,
          },
          reason,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          transaction,
        });

        return reopenedPeriod;
      });

      return res.status(200).json({
        success: true,
        message: 'Accounting period reopened successfully',
        accountingPeriod: serializePeriod(period),
      });
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
