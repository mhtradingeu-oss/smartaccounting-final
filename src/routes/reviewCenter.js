const express = require('express');
const { authenticate, requireCompany, requireRole } = require('../middleware/authMiddleware');
const reviewCenterService = require('../services/reviewCenterService');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

router.get(
  '/summary',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res) => {
    try {
      const summary = await reviewCenterService.getSmartReviewSummary({
        companyId: req.companyId,
      });

      res.json(summary);
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        code: error.code || 'REVIEW_CENTER_ERROR',
        message: error.message || 'Failed to build Smart Review Center summary',
      });
    }
  },
);

module.exports = router;
