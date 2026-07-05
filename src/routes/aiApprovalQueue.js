const express = require('express');
const { authenticate, requireCompany, requireRole } = require('../middleware/authMiddleware');
const { listApprovalQueueItems } = require('../services/ai/aiApprovalQueueRepository');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

router.get(
  '/',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res) => {
    const items = await listApprovalQueueItems({
      companyId: req.companyId,
      limit: req.query?.limit,
    });

    res.json({
      success: true,
      persisted: true,
      items,
      message: items.length
        ? 'AI approval queue is persisted and read-only.'
        : 'AI approval queue is persisted. No approval queue items are currently pending review.',
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
