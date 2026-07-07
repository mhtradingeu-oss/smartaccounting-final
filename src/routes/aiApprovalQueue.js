const express = require('express');
const { authenticate, requireCompany, requireRole } = require('../middleware/authMiddleware');
const {
  decideApprovalQueueItem,
  listApprovalQueueItems,
} = require('../services/ai/aiApprovalQueueRepository');
const { AI_APPROVAL_DECISIONS } = require('../services/ai/aiApprovalQueueContract');
const AuditLogService = require('../services/auditLogService');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

router.get('/', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res) => {
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
});

const handleApprovalDecision = (decision) => async (req, res, next) => {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    const userId = req.user?.id;
    const { approvalId, decisionReason } = req.body || {};

    if (!approvalId) {
      return res.status(400).json({
        success: false,
        error: 'approvalId is required.',
      });
    }

    if (decision === AI_APPROVAL_DECISIONS.REJECT && !String(decisionReason || '').trim()) {
      return res.status(400).json({
        success: false,
        error: 'Rejection requires a decision reason.',
      });
    }

    const result = await decideApprovalQueueItem({
      approvalId,
      companyId,
      decision,
      decidedByUserId: userId,
      decisionReason,
    });

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: result.error,
        item: result.item || null,
      });
    }

    const auditReason =
      decision === AI_APPROVAL_DECISIONS.APPROVE
        ? 'AI approval queue item approved by human reviewer.'
        : result.item.decisionReason;

    const auditIpAddress = req.ip || null;
    const auditUserAgent = req.get('User-Agent') || null;
    const auditRequestId = req.id || req.requestId || null;

    await AuditLogService.appendEntry({
      action: `ai_approval_${decision}`,
      resourceType: 'AIApprovalQueueItem',
      resourceId: approvalId,
      userId,
      oldValues: null,
      newValues: {
        approvalId,
        status: result.item.status,
        decision,
        decisionReason: result.item.decisionReason,
      },
      ipAddress: auditIpAddress,
      userAgent: auditUserAgent,
      reason: auditReason,
      context: {
        reason: auditReason,
        status: 'SUCCESS',
        actorType: 'USER',
        actorId: userId,
        eventClass: 'ACCOUNTING',
        scopeType: 'COMPANY',
        companyId,
        requestId: auditRequestId,
        ipAddress: auditIpAddress,
        userAgent: auditUserAgent,
      },
    });

    return res.json({
      success: true,
      persisted: true,
      item: result.item,
      meta: {
        companyId,
        readOnly: false,
        executionEnabled: false,
        approvalDecisionsEnabled: true,
      },
    });
  } catch (err) {
    return next(err);
  }
};

router.post(
  '/approve',
  requireRole(['admin', 'accountant']),
  handleApprovalDecision(AI_APPROVAL_DECISIONS.APPROVE),
);
router.post(
  '/reject',
  requireRole(['admin', 'accountant']),
  handleApprovalDecision(AI_APPROVAL_DECISIONS.REJECT),
);

module.exports = router;
