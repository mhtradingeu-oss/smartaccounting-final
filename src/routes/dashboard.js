const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const analyticsService = require('../services/smartAnalyticsService');
const dashboardService = require('../services/dashboardService');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

router.get('/stats', async (req, res, next) => {
  try {
    const [stats, invoiceStats, monthlyData, financialOverview] = await Promise.all([
      dashboardService.getStats(req.companyId),
      analyticsService.getInvoiceStats(req.companyId),
      dashboardService.getMonthlyData(req.companyId),
      dashboardService.getFinancialOverview(req.companyId, {
        from: req.query.from || null,
        to: req.query.to || null,
        asOf: req.query.asOf || req.query.to || null,
      }),
    ]);
    const auditReadiness = dashboardService.getAuditReadiness({
      stats,
      financialOverview,
    });

    res.status(200).json({
      success: true,
      companyId: req.companyId,
      stats,
      invoiceStats,
      monthlyData,
      financialOverview,
      auditReadiness,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
