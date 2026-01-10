const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const analyticsService = require('../services/smartAnalyticsService');
const dashboardService = require('../services/dashboardService');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

router.get('/stats', async (req, res, next) => {
  try {
    const [stats, invoiceStats, monthlyData] = await Promise.all([
      dashboardService.getStats(req.companyId),
      analyticsService.getInvoiceStats(req.companyId),
      dashboardService.getMonthlyData(req.companyId),
    ]);
    res.status(200).json({
      success: true,
      companyId: req.companyId,
      stats,
      invoiceStats,
      monthlyData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
