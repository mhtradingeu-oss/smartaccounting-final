const express = require('express');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const analyticsService = require('../services/smartAnalyticsService');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

router.get('/stats', async (req, res, next) => {
  try {
    const stats = await analyticsService.getInvoiceStats(req.companyId);
    res.status(200).json({ success: true, ...stats });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
