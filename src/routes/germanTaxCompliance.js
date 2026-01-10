const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const germanTaxEngine = require('../services/germanTaxEngine');
const elsterService = require('../services/elsterService');
const gobdService = require('../services/gobdComplianceService');
const logger = require('../lib/logger');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');

const router = express.Router();

router.use(disabledFeatureHandler('Elster/compliance'));
router.use(authenticate);
router.use(requireCompany);

// Generate UStVA (VAT advance return)
router.post('/ustva/generate', async (req, res) => {
  try {
    const { year, quarter } = req.body;
    const companyId = req.companyId;

    const ustvaReport = await germanTaxEngine.generateUStVA(companyId, year, quarter);

    // Create audit log
    await gobdService.createImmutableRecord(
      'ustva_generated',
      { year, quarter, report: ustvaReport },
      req.user.id,
      'tax_report',
    );

    res.json({
      success: true,
      report: ustvaReport,
    });
  } catch (error) {
    logger.error('UStVA generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate UStVA report',
    });
  }
});

// Submit UStVA to ELSTER
router.post('/ustva/submit', async (req, res) => {
  try {
    const { reportData, sessionToken } = req.body;

    const submission = await elsterService.submitUStVA(reportData, sessionToken);

    if (submission.success) {
      await gobdService.createImmutableRecord(
        'ustva_submitted',
        { submissionId: submission.submissionId, reportData },
        req.user.id,
        'tax_submission',
      );
    }

    res.json(submission);
  } catch (error) {
    logger.error('UStVA submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit UStVA to ELSTER',
    });
  }
});

// Generate EÜR (Income-Expense Calculation)
router.post('/eur/generate', async (req, res) => {
  try {
    const { year } = req.body;
    const companyId = req.companyId;

    const eurReport = await germanTaxEngine.generateEUR(companyId, year);

    await gobdService.createImmutableRecord(
      'eur_generated',
      { year, report: eurReport },
      req.user.id,
      'tax_report',
    );

    res.json({
      success: true,
      report: eurReport,
    });
  } catch (error) {
    logger.error('EÜR generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate EÜR report',
    });
  }
});

// Check tax compliance
router.get('/compliance/check/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const companyId = req.companyId;

    const compliance = await germanTaxEngine.checkTaxCompliance(companyId, parseInt(year));

    res.json({
      success: true,
      compliance,
    });
  } catch (error) {
    logger.error('Tax compliance check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check tax compliance',
    });
  }
});

// Get tax calendar and deadlines
router.get('/calendar/:year', async (req, res) => {
  try {
    const { year } = req.params;

    const calendar = germanTaxEngine.generateTaxCalendar(parseInt(year));
    const elsterDeadlines = await elsterService.getTaxDeadlines(parseInt(year));

    res.json({
      success: true,
      calendar: {
        ...calendar,
        elsterDeadlines: elsterDeadlines.deadlines || elsterDeadlines.fallbackDeadlines,
      },
    });
  } catch (error) {
    logger.error('Tax calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tax calendar',
    });
  }
});

// Export GoBD-compliant data
router.post('/export/gobd', async (req, res) => {
  try {
    const { startDate, endDate, format = 'XML' } = req.body;

    const exportData = await gobdService.exportGoBDData(
      new Date(startDate),
      new Date(endDate),
      format,
    );

    await gobdService.createImmutableRecord(
      'gobd_export',
      { startDate, endDate, format },
      req.user.id,
      'export',
    );

    res.setHeader('Content-Type', format === 'XML' ? 'application/xml' : 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gobd_export_${startDate}_${endDate}.${format.toLowerCase()}"`,
    );
    res.send(exportData);
  } catch (error) {
    logger.error('GoBD export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export GoBD data',
    });
  }
});

// Validate data integrity
router.post('/validate/integrity', async (req, res) => {
  try {
    const validation = await gobdService.validateDataIntegrity();

    res.json({
      success: true,
      validation,
    });
  } catch (error) {
    logger.error('Data integrity validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate data integrity',
    });
  }
});

// ELSTER connection test
router.get('/elster/test', async (req, res) => {
  try {
    const connectionTest = await elsterService.testConnection();

    res.json({
      success: true,
      elster: connectionTest,
    });
  } catch (error) {
    logger.error('ELSTER test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test ELSTER connection',
    });
  }
});

module.exports = router;
