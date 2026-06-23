const express = require('express');
const { requireRole, requireCompany } = require('../middleware/authMiddleware');
const financialReportService = require('../services/financialReportService');

const router = express.Router();

router.use(requireCompany);

router.get('/trial-balance', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getTrialBalance({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/profit-loss', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getProfitAndLoss({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/balance-sheet', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getBalanceSheet({
      companyId: req.companyId,
      asOf: req.query.asOf || req.query.to || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/general-ledger', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getGeneralLedger({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
      accountId: req.query.accountId || null,
      accountCode: req.query.accountCode || null,
      sourceType: req.query.sourceType || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
