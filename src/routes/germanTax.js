const express = require('express');
const logger = require('../lib/logger');
const ApiError = require('../lib/errors/apiError');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const germanTaxCompliance = require('../services/germanTaxCompliance');
const elsterService = require('../services/elsterService');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');

const router = express.Router();

// Explicitly block unsupported methods for VAT/tax reporting endpoints
router.all('/vat/*', disabledFeatureHandler('VAT/tax reporting'));
router.use(authenticate);
router.use(requireCompany);

router.get('/eur/:year', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    if (year < 2020 || year > new Date().getFullYear()) {
      return next(new ApiError(400, 'Invalid year', 'INVALID_YEAR'));
    }

    const eurData = await germanTaxCompliance.calculateEUR(req.companyId, year);

    res.json({
      message: 'EÜR generated successfully',
      data: eurData,
    });
  } catch (error) {
    next(new ApiError(500, 'Failed to generate EÜR', 'EUE_GENERATION_ERROR'));
  }
});

router.post('/vat-return', async (req, res, next) => {
  try {
    const { year, quarter, month } = req.body;

    if (!year || (!quarter && !month)) {
      return next(
        new ApiError(
          400,
          'Year and either quarter or month must be provided',
          'INVALID_VAT_PARAMS',
        ),
      );
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
    next(new ApiError(500, 'Failed to generate VAT return', 'VAT_GENERATION_ERROR'));
  }
});

router.post('/elster-export', async (req, res, next) => {
  try {
    const { vatReturn } = req.body;

    if (!vatReturn) {
      return next(new ApiError(400, 'VAT return data is required', 'MISSING_VAT_RETURN'));
    }

    const elsterExport = await germanTaxCompliance.generateElsterExport(req.companyId, vatReturn);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${elsterExport.filename}"`);
    res.send(elsterExport.xml);
  } catch (error) {
    next(new ApiError(500, 'Failed to generate ELSTER export', 'ELSTER_EXPORT_ERROR'));
  }
});

router.get('/kleinunternehmer/:year', async (req, res, next) => {
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
    next(
      new ApiError(500, 'Failed to check Kleinunternehmer eligibility', 'KLEINUNTERNEHMER_ERROR'),
    );
  }
});

router.post('/validate-transaction', async (req, res, next) => {
  try {
    const { transaction } = req.body;

    if (!transaction) {
      return next(new ApiError(400, 'Transaction data is required', 'MISSING_TRANSACTION'));
    }

    const compliance = germanTaxCompliance.validateGoBDCompliance(transaction);

    res.json({
      message: 'Transaction validation completed',
      data: compliance,
    });
  } catch (error) {
    next(new ApiError(500, 'Failed to validate transaction', 'TRANSACTION_VALIDATION_ERROR'));
  }
});

router.post('/submit', async (req, res, next) => {
  try {
    const { reportType, period, data, submitToElster = false } = req.body;
    const companyId = req.companyId;

    const { Company } = require('../models');
    const company = await Company.findByPk(companyId);

    if (!company) {
      return next(new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND'));
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
    next(new ApiError(500, 'Failed to submit tax report', 'TAX_SUBMIT_ERROR'));
  }
});

module.exports = router;
