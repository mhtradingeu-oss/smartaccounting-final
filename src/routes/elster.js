const express = require('express');
const elsterService = require('../services/elsterService');
const { authenticate } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');
const { elsterLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(elsterLimiter);
router.use(disabledFeatureHandler('Elster exports'));
router.use(authenticate);

router.post(
  '/submit',
  authenticate,
  [
    body('reportType').isIn(['UStVA', 'EÜR']).withMessage('Invalid report type'),
    body('year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
    body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
    body('quarter').optional().isInt({ min: 1, max: 4 }).withMessage('Invalid quarter'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { year, month, quarter } = req.body;
      const companyId = req.user.companyId;

      let taxReportData;
      if (month) {
        taxReportData = await elsterService.processMonthlyData(companyId, year, month);
      } else if (quarter) {
        taxReportData = await elsterService.processQuarterlyData(companyId, year, quarter);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either month or quarter must be specified',
        });
      }

      const { Company } = require('../models');
      const company = await Company.findByPk(companyId);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      const submissionResult = await elsterService.submitTaxReport(taxReportData, company);

      res.json({
        success: true,
        message: 'Tax report submitted to ELSTER successfully',
        submission: {
          transferTicket: submissionResult.transferTicket,
          status: submissionResult.status,
          submissionId: submissionResult.submissionId,
          environment: submissionResult.environment,
          timestamp: submissionResult.timestamp,
        },
        reportData: {
          reportType: taxReportData.reportType,
          period: taxReportData.period,
          transactions: taxReportData.transactions,
          vatSummary: taxReportData.data,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to submit tax report to ELSTER',
        error: error.message,
      });
    }
  },
);

router.get('/status/:transferTicket', authenticate, async (req, res) => {
  try {
    const { transferTicket } = req.params;

    const status = await elsterService.getSubmissionStatus(transferTicket);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get submission status',
      error: error.message,
    });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const history = elsterService.getSubmissionHistory(companyId);

    res.json({
      success: true,
      history: history.map((entry) => ({
        timestamp: entry.timestamp,
        transferTicket: entry.transferTicket,
        status: entry.status,
        reportType: entry.reportType,
        period: entry.period,
        submissionId: entry.response?.submissionId,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get submission history',
      error: error.message,
    });
  }
});

router.post('/generate-xml', authenticate, async (req, res) => {
  try {
    const { year, month } = req.body;
    const companyId = req.user.companyId;

    const taxReportData = await elsterService.processMonthlyData(companyId, year, month);

    const elsterXML = await elsterService.generateElsterXML(taxReportData);

    const isValid = await elsterService.validateElsterXML(elsterXML);

    res.json({
      success: true,
      xml: elsterXML,
      isValid,
      reportData: taxReportData.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate ELSTER XML',
      error: error.message,
    });
  }
});

router.get('/status/:ticket', authenticate, async (req, res) => {
  try {
    const { ticket } = req.params;

    const status = await elsterService.checkSubmissionStatus(ticket);

    res.json({
      success: true,
      ticket,
      status: status.status,
      message: status.message,
      lastUpdate: status.lastUpdate,
      details: status.details,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check submission status',
      error: error.message,
    });
  }
});

router.get('/history', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const history = await elsterService.getSubmissionHistory(companyId);

    res.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve submission history',
      error: error.message,
    });
  }
});

module.exports = router;
