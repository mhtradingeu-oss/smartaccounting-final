const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const expenseService = require('../services/expenseService');
const accountingPostingService = require('../services/accountingPostingService');
const { expenseSchema } = require('../validators/expenseValidator');
const {
  normalizeExpensePayload,
  logDemoAutoFills,
} = require('../utils/demoPayloadNormalizer');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// List all expenses
router.get(
  '/',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res, next) => {
    try {
      const companyId = req.companyId;
      const expenses = await expenseService.listExpenses(companyId);
      res.status(200).json({ success: true, expenses });
    } catch (error) {
      next(error);
    }
  },
);

// Get single expense by ID
router.get(
  '/:expenseId',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res, next) => {
    try {
      const expense = await expenseService.getExpenseById(req.params.expenseId, req.companyId);
      if (!expense) {
        return res.status(404).json({ success: false, message: 'Expense not found' });
      }
      res.status(200).json({ success: true, expense });
    } catch (error) {
      next(error);
    }
  },
);

// Create expense (manual entry)
router.post('/', requireRole(['admin', 'accountant']), async (req, res, next) => {
  // Demo mode: normalize payload with auto-fills
  const { normalizedData, demoFills } = normalizeExpensePayload(
    req.body,
    req.userId,
    req.companyId,
  );

  // Log demo auto-fills to audit trail
  logDemoAutoFills(demoFills, {
    userId: req.userId,
    companyId: req.companyId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    originalPayload: req.body,
  });

  const { error, value } = expenseSchema.validate(normalizedData, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    error.status = 400;
    return next(error);
  }

  try {
    const { systemContext, reason } = normalizedData;
    const expense = await expenseService.createExpense(
      { ...value, vendorName: normalizedData.vendorName },
      req.userId,
      req.companyId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.userId,
        ...(systemContext ? { ...systemContext } : {}),
        ...(reason ? { reason } : {}),
        demoFills: demoFills.length > 0 ? demoFills : undefined,
      },
    );
    res.status(201).json({
      success: true,
      expense,
      systemContext: systemContext || null,
      reason: reason || null,
      demoFills: demoFills.length > 0 ? demoFills : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// Create accounting posting preview for an expense.
// This is intentionally preview-only: it creates a draft journal entry and does not post/finalize the expense.
router.post('/:expenseId/posting-preview', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const result = await accountingPostingService.createExpensePostingPreview({
      expenseId: req.params.expenseId,
      companyId: req.companyId,
      createdBy: req.user?.id || req.userId || null,
    });

    return res.status(result.reusedPreview ? 200 : 201).json({
      success: true,
      message: result.reusedPreview
        ? 'Existing expense posting preview reused'
        : 'Expense posting preview created',
      journalEntry: result.journalEntry,
      lines: result.lines,
      previewOnly: true,
      reusedPreview: result.reusedPreview === true,
    });
  } catch (error) {
    if (/expense not found/i.test(error.message)) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    return next(error);
  }
});


// Finalize accounting posting for an expense.
// This converts an existing draft posting preview into a posted journal entry.
// It does not create a second journal entry and does not mutate posted entries.
router.post('/:expenseId/post', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const result = await accountingPostingService.finalizeExpensePosting({
      expenseId: req.params.expenseId,
      companyId: req.companyId,
      postedBy: req.user?.id || req.userId || null,
    });

    return res.status(200).json({
      success: true,
      message: 'Expense posting finalized',
      journalEntry: result.journalEntry,
      lines: result.lines,
      posted: true,
      finalizedFromPreview: true,
    });
  } catch (error) {
    if (/expense not found/i.test(error.message)) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (
      error.code === 'EXPENSE_POSTING_ALREADY_FINALIZED' ||
      error.code === 'EXPENSE_POSTING_PREVIEW_REQUIRED' ||
      error.code === 'EXPENSE_POSTING_PREVIEW_NOT_AVAILABLE'
    ) {
      return res.status(error.status || 409).json({
        success: false,
        message: error.message,
        errorCode: error.code,
      });
    }

    return next(error);
  }
});


// Patch expense status (status transition)
router.patch('/:expenseId/status', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const { status, systemContext, reason } = req.body;
    // const oldExpense = await expenseService.getExpenseById(req.params.expenseId, req.companyId);
    const expense = await expenseService.updateExpenseStatus(
      req.params.expenseId,
      status,
      req.companyId,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.userId,
        ...(systemContext ? { ...systemContext } : {}),
        ...(reason ? { reason } : {}),
      },
    );

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: 'Expense not found or invalid status transition' });
    }

    res.status(200).json({
      success: true,
      expense,
      systemContext: systemContext || null,
      reason: reason || null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
