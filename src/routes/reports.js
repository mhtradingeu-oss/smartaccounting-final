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

module.exports = router;
