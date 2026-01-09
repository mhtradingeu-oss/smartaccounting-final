const express = require('express');
const { TaxReport, Company } = require('../models');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const { generateTaxReport } = require('../services/taxCalculator');
const { exportToElster } = require('../services/elsterService');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');
const AuditLogService = require('../services/auditLogService');

const router = express.Router();

router.use(disabledFeatureHandler('Tax reporting'));

router.get('/', authenticate, requireCompany, async (req, res) => {
  try {
    const { page = 1, limit = 20, reportType, period } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { companyId: req.user.companyId };
    if (reportType) {
      whereClause.reportType = reportType;
    }
    if (period) {
      whereClause.period = period;
    }

    const taxReports = await TaxReport.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Company,
          as: 'Company',
          attributes: ['name'],
        },
      ],
    });

    res.json({
      taxReports: taxReports.rows,
      total: taxReports.count,
      pages: Math.ceil(taxReports.count / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'accountant', 'auditor']),
  requireCompany,
  async (req, res) => {
    try {
      const { id } = req.params;

      const taxReport = await TaxReport.findOne({
        where: {
          id,
          companyId: req.user.companyId,
        },
        include: [
          {
            model: Company,
            as: 'Company',
            attributes: ['name'],
          },
        ],
      });

      if (!taxReport) {
        return res.status(404).json({ error: 'Tax report not found' });
      }

      res.json(taxReport);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post(
  '/',
  authenticate,
  requireCompany,
  requireRole(['admin', 'accountant']),
  [
    body('reportType').isIn(['USt', 'KSt', 'GewSt', 'annual']).withMessage('Invalid report type'),
    body('period.year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
    body('period.quarter').optional().isInt({ min: 1, max: 4 }).withMessage('Invalid quarter'),
    body('period.month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { reportType, period, data } = req.body;

      if (!reportType || !period) {
        return res.status(400).json({ error: 'Report type and period are required' });
      }

      const existingReport = await TaxReport.findOne({
        where: {
          companyId: req.user.companyId,
          reportType,
          period: JSON.stringify(period),
        },
      });

      if (existingReport) {
        return res.status(409).json({ error: 'Tax report for this period already exists' });
      }

      const generatedData = await generateTaxReport(req.user.companyId, reportType, period);

      const taxReport = await TaxReport.create({
        companyId: req.user.companyId,
        reportType,
        year: period.year || null,
        period: JSON.stringify(period),
        data: data || generatedData,
        status: 'draft',
        generatedAt: new Date(),
      });

      res.status(201).json({
        message: 'Tax report created successfully',
        taxReport,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.put(
  '/:id',
  authenticate,
  requireRole(['admin', 'accountant']),
  requireCompany,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { data, status } = req.body;

      const taxReport = await TaxReport.findOne({
        where: {
          id,
          companyId: req.user.companyId,
        },
      });

      if (!taxReport) {
        return res.status(404).json({ error: 'Tax report not found' });
      }

      if (taxReport.status === 'submitted') {
        return res.status(400).json({ error: 'Cannot edit submitted tax reports' });
      }

      await taxReport.update({
        data: data || taxReport.data,
        status: status || taxReport.status,
        updatedAt: new Date(),
      });

      res.json({
        message: 'Tax report updated successfully',
        taxReport,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.post(
  '/:id/submit',
  authenticate,
  requireRole(['admin', 'accountant']),
  requireCompany,
  async (req, res) => {
    try {
      const { id } = req.params;

      const taxReport = await TaxReport.findOne({
        where: {
          id,
          companyId: req.user.companyId,
        },
      });

      if (!taxReport) {
        return res.status(404).json({ error: 'Tax report not found' });
      }

      if (taxReport.status === 'submitted') {
        return res.status(400).json({ error: 'Tax report already submitted' });
      }

      await taxReport.update({
        status: 'submitted',
        submittedAt: new Date(),
      });

      res.json({
        message: 'Tax report submitted successfully',
        taxReport,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

router.get('/:id/export/elster', authenticate, requireCompany, async (req, res) => {
  try {
    const { id } = req.params;

    const taxReport = await TaxReport.findOne({
      where: {
        id,
        companyId: req.user.companyId,
      },
      include: [
        {
          model: Company,
          as: 'Company',
        },
      ],
    });

    if (!taxReport) {
      return res.status(404).json({ error: 'Tax report not found' });
    }

    const elsterXml = await exportToElster(taxReport);

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="elster_${taxReport.reportType}_${taxReport.id}.xml"`,
    });

    res.send(elsterXml);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.delete('/:id', authenticate, requireRole(['admin']), requireCompany, async (req, res) => {
  try {
    const { id } = req.params;
    const reason = (req.body?.reason || req.query?.reason || '').trim();

    if (!reason) {
      return res
        .status(400)
        .json({ error: 'A documented reason is required for deleting tax reports.' });
    }

    const taxReport = await TaxReport.findOne({
      where: {
        id,
        companyId: req.user.companyId,
      },
    });

    if (!taxReport) {
      return res.status(404).json({ error: 'Tax report not found' });
    }

    if (taxReport.status === 'submitted') {
      return res.status(400).json({ error: 'Cannot delete submitted tax reports' });
    }

    const oldValues = { status: taxReport.status, reportType: taxReport.reportType };
    await taxReport.destroy();

    await AuditLogService.appendEntry({
      action: 'TAX_REPORT_DELETED',
      resourceType: 'TaxReport',
      resourceId: String(taxReport.id),
      userId: req.user.id,
      oldValues,
      newValues: { deletedAt: new Date().toISOString(), reason },
      reason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Tax report deleted successfully', reason });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/generate',
  authenticate,
  requireCompany,
  requireRole(['admin', 'accountant']),
  [
    body('reportType').isIn(['USt', 'KSt', 'GewSt', 'annual']).withMessage('Invalid report type'),
    body('period.year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
    body('period.quarter').optional().isInt({ min: 1, max: 4 }).withMessage('Invalid quarter'),
    body('period.month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { reportType, period } = req.body;

      const reportData = await generateTaxReport(req.user.companyId, reportType, period);

      res.json({
        message: 'Tax report generated successfully',
        reportType,
        period,
        data: reportData,
        preview: true,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

module.exports = router;
