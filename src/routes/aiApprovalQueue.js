const express = require('express');
const { authenticate, requireCompany, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

router.get(
  '/',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res) => {
    res.json({
      success: true,
      persisted: false,
      items: [],
      message: 'AI approval queue persistence is not enabled yet.',
      meta: {
        companyId: req.companyId,
        readOnly: true,
        executionEnabled: false,
        approvalDecisionsEnabled: false,
      },
    });
  },
);

module.exports = router;
