const express = require('express');
const { requireRole, requireCompany } = require('../middleware/authMiddleware');
const accountingPostingService = require('../services/accountingPostingService');
const { JournalEntry, JournalEntryLine, ChartAccount, AuditLog } = require('../models');

const router = express.Router();

router.use(requireCompany);


const buildJournalEntryWhere = ({ companyId, query = {} }) => {
  const where = { companyId };

  if (query.status) {
    where.status = String(query.status);
  }

  if (query.sourceType) {
    where.sourceType = String(query.sourceType);
  }

  if (query.sourceId) {
    where.sourceId = String(query.sourceId);
  }

  if (query.reversalOfId) {
    where.reversalOfId = String(query.reversalOfId);
  }

  return where;
};

const parsePagination = (query = {}) => {
  const rawLimit = Number(query.limit ?? 50);
  const rawOffset = Number(query.offset ?? 0);

  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

  return { limit, offset };
};

const journalEntryInclude = [
  {
    model: JournalEntryLine,
    as: 'lines',
    include: [
      {
        model: ChartAccount,
        as: 'account',
        required: false,
      },
    ],
  },
];

router.get('/', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = buildJournalEntryWhere({
      companyId: req.companyId,
      query: req.query,
    });

    const result = await JournalEntry.findAndCountAll({
      where,
      include: journalEntryInclude,
      order: [
        ['entryDate', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      journalEntries: result.rows,
      pagination: {
        total: result.count,
        limit,
        offset,
      },
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/:journalEntryId/audit-log', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const journalEntry = await JournalEntry.findOne({
      where: {
        id: req.params.journalEntryId,
        companyId: req.companyId,
      },
      attributes: ['id', 'companyId'],
    });

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        message: 'Journal entry not found',
      });
    }

    const auditLog = await AuditLog.findAll({
      where: {
        resourceType: 'JournalEntry',
        resourceId: String(req.params.journalEntryId),
        companyId: req.companyId,
      },
      order: [
        ['timestamp', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    return res.status(200).json({
      success: true,
      journalEntryId: req.params.journalEntryId,
      auditLog,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/:journalEntryId', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const journalEntry = await JournalEntry.findOne({
      where: {
        id: req.params.journalEntryId,
        companyId: req.companyId,
      },
      include: journalEntryInclude,
    });

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        message: 'Journal entry not found',
      });
    }

    return res.status(200).json({
      success: true,
      journalEntry,
    });
  } catch (error) {
    return next(error);
  }
});


router.post('/:journalEntryId/reverse', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const result = await accountingPostingService.reverseJournalEntry({
      journalEntryId: req.params.journalEntryId,
      companyId: req.companyId,
      reversedBy: req.user?.id || req.userId || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Journal entry reversed',
      originalEntry: result.originalEntry,
      reversalEntry: result.reversalEntry,
      lines: result.reversalEntry?.lines || result.reversalLines || [],
      reversed: true,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
