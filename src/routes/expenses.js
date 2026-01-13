const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const expenseService = require('../services/expenseService');
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
    const expense = await expenseService.createExpense(value, req.userId, req.companyId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.userId,
      ...(systemContext ? { ...systemContext } : {}),
      ...(reason ? { reason } : {}),
      demoFills: demoFills.length > 0 ? demoFills : undefined,
    });
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
