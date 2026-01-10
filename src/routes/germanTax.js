const express = require('express');
const logger = require('../lib/logger');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const germanTaxCompliance = require('../services/germanTaxCompliance');
const elsterService = require('../services/elsterService');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');

const router = express.Router();

router.use(disabledFeatureHandler('VAT/tax reporting'));
router.use(authenticate);
router.use(requireCompany);

router.get('/eur/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (year < 2020 || year > new Date().getFullYear()) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const eurData = await germanTaxCompliance.calculateEUR(req.companyId, year);

    res.json({
      message: 'EÜR generated successfully',
      data: eurData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate EÜR' });
  }
});

router.post('/vat-return', async (req, res) => {
  try {
    const { year, quarter, month } = req.body;

    if (!year || (!quarter && !month)) {
      return res.status(400).json({
        error: 'Year and either quarter or month must be provided',
      });
    }

    const vatReturn = await germanTaxCompliance.generateVATReturn(req.companyId, {
      year,
      quarter,
      month,
    });

    res.json({
      message: 'VAT return generated successfully',
      data: vatReturn,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate VAT return' });
  }
});

router.post('/elster-export', async (req, res) => {
  try {
    const { vatReturn } = req.body;

    if (!vatReturn) {
      return res.status(400).json({ error: 'VAT return data is required' });
    }

    const elsterExport = await germanTaxCompliance.generateElsterExport(
      req.companyId,
      vatReturn,
    );

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${elsterExport.filename}"`);
    res.send(elsterExport.xml);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate ELSTER export' });
  }
});

router.get('/kleinunternehmer/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    const eligibility = await germanTaxCompliance.checkKleinunternehmerEligibility(
      req.companyId,
      year,
    );

    res.json({
      message: 'Kleinunternehmer eligibility checked',
      data: eligibility,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check Kleinunternehmer eligibility' });
  }
});

router.post('/validate-transaction', async (req, res) => {
  try {
    const { transaction } = req.body;

    if (!transaction) {
      return res.status(400).json({ error: 'Transaction data is required' });
    }

    const compliance = germanTaxCompliance.validateGoBDCompliance(transaction);

    res.json({
      message: 'Transaction validation completed',
      data: compliance,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate transaction' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { reportType, period, data, submitToElster = false } = req.body;
    const companyId = req.companyId;

    const { Company } = require('../models');
    const company = await Company.findByPk(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    const taxReport = {
      companyId,
      reportType,
      period,
      data,
      submittedAt: new Date(),
      submittedBy: req.user.id,
      company: {
        name: company.name,
        taxNumber: company.taxNumber || '12345678901',
      },
    };

    const elsterXML = await elsterService.generateElsterXML(taxReport);
    const submissionId = `TAX_${Date.now()}`;

    let elsterSubmission = null;

    if (submitToElster) {
      try {
        elsterSubmission = await elsterService.submitTaxReport(taxReport, company);
      } catch (elsterError) {
        elsterSubmission = {
          status: 'ELSTER_ERROR',
          error: elsterError.message,
        };
        logger.error('ELSTER submission failed', elsterError);
      }
    }

    try {
      const { TaxReport } = require('../models');
      const reportYear = period?.year || new Date().getFullYear();
      const reportPeriod = period ? JSON.stringify(period) : JSON.stringify({ year: reportYear });

      await TaxReport.create({
        companyId,
        reportType,
        year: reportYear,
        period: reportPeriod,
        data,
        status: elsterSubmission?.status || 'GENERATED',
        elsterTransferTicket: elsterSubmission?.transferTicket,
        submittedBy: req.user.id,
      });
    } catch (dbError) {
      logger.error('Failed to persist tax report', dbError);
    }

    res.json({
      success: true,
      message: 'Tax report processed successfully',
      submissionId,
      elsterXML,
      elsterSubmission: elsterSubmission
        ? {
            transferTicket: elsterSubmission.transferTicket,
            status: elsterSubmission.status,
            submissionId: elsterSubmission.submissionId,
            environment: elsterSubmission.environment,
            message: elsterSubmission.message,
          }
        : null,
      reportData: {
        reportType,
        period,
        transactions: data.transactions || 0,
        vatSummary: data,
      },
    });
  } catch (error) {
    logger.error('Failed to submit tax report', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit tax report',
      error: error.message,
    });
  }
});

module.exports = router;
