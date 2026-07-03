const express = require('express');
const { requireRole, requireCompany } = require('../middleware/authMiddleware');
const taxBridgeReadinessService = require('../services/taxBridgeReadinessService');

const router = express.Router();

router.use(requireCompany);

router.get('/readiness', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res) => {
  try {
    const readiness = await taxBridgeReadinessService.getTaxBridgeReadiness({
      companyId: req.companyId,
      from: req.query.from,
      to: req.query.to,
    });

    res.json(readiness);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to build Tax Bridge readiness report',
    });
  }
});

module.exports = router;
