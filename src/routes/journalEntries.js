const express = require('express');
const { Op } = require('sequelize');
const { requireRole, requireCompany } = require('../middleware/authMiddleware');
const accountingPostingService = require('../services/accountingPostingService');
const { JournalEntry, JournalEntryLine, ChartAccount, AuditLog } = require('../models');

const router = express.Router();

const JOURNAL_ENTRY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidJournalEntryId = (value) => JOURNAL_ENTRY_UUID_RE.test(String(value || ''));

const rejectInvalidJournalEntryId = (req, res, next) => {
  const journalEntryId = req.params.journalEntryId;

  if (!isValidJournalEntryId(journalEntryId)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid journal entry id',
      errorCode: 'JOURNAL_ENTRY_ID_INVALID',
      requestId: req.id || req.requestId || null,
    });
  }

  return next();
};


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


const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return `"${String(value).replace(/"/g, '""')}"`;
};

const flattenJournalEntriesForExport = (journalEntries = []) => {
  const rows = [];

  for (const entry of journalEntries) {
    const plainEntry = typeof entry.get === 'function' ? entry.get({ plain: true }) : entry;
    const lines = Array.isArray(plainEntry.lines) ? plainEntry.lines : [];

    for (const line of lines) {
      rows.push({
        journalEntryId: plainEntry.id,
        companyId: plainEntry.companyId,
        entryDate: plainEntry.entryDate,
        status: plainEntry.status,
        sourceType: plainEntry.sourceType,
        sourceId: plainEntry.sourceId,
        description: plainEntry.description,
        currency: plainEntry.currency,
        postedAt: plainEntry.postedAt,
        reversedAt: plainEntry.reversedAt,
        reversalOfId: plainEntry.reversalOfId,
        lineId: line.id,
        accountId: line.accountId,
        accountCode: line.account?.code || '',
        accountName: line.account?.name || '',
        debit: line.debit,
        credit: line.credit,
        taxCode: line.taxCode,
        vatRate: line.vatRate,
        counterpartyName: line.counterpartyName,
        lineDescription: line.description,
      });
    }
  }

  return rows;
};

const buildJournalExportWhere = ({ companyId, query = {} }) => {
  const where = buildJournalEntryWhere({ companyId, query });

  if (query.from || query.to) {
    where.entryDate = {};

    if (query.from) {
      where.entryDate[Op.gte] = String(query.from);
    }

    if (query.to) {
      where.entryDate[Op.lte] = String(query.to);
    }
  }

  return where;
};

const toJournalExportCsv = (rows = []) => {
  const columns = [
    'journalEntryId',
    'companyId',
    'entryDate',
    'status',
    'sourceType',
    'sourceId',
    'description',
    'currency',
    'postedAt',
    'reversedAt',
    'reversalOfId',
    'lineId',
    'accountId',
    'accountCode',
    'accountName',
    'debit',
    'credit',
    'taxCode',
    'vatRate',
    'counterpartyName',
    'lineDescription',
  ];

  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(row[column])).join(','))
    .join('\n');

  return body ? `${header}\n${body}` : `${header}\n`;
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



router.get('/export', requireRole(['admin', 'accountant', 'auditor']), async (req, res, next) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported export format',
      });
    }

    const journalEntries = await JournalEntry.findAll({
      where: buildJournalExportWhere({
        companyId: req.companyId,
        query: req.query,
      }),
      include: journalEntryInclude,
      order: [
        ['entryDate', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    const rows = flattenJournalEntriesForExport(journalEntries);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment;filename="journal-entries.csv"');
      return res.status(200).send(toJournalExportCsv(rows));
    }

    return res.status(200).json({
      success: true,
      meta: {
        companyId: req.companyId,
        count: rows.length,
        format,
        filters: {
          status: req.query.status || null,
          sourceType: req.query.sourceType || null,
          from: req.query.from || null,
          to: req.query.to || null,
        },
      },
      rows,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/:journalEntryId/audit-log', rejectInvalidJournalEntryId, requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
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


router.get('/:journalEntryId', rejectInvalidJournalEntryId, requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
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


router.post('/:journalEntryId/reverse', rejectInvalidJournalEntryId, requireRole(['admin', 'accountant']), async (req, res, next) => {
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
