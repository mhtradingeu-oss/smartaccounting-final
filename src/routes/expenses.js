const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const expenseService = require('../services/expenseService');
const { withAuditLog } = require('../services/withAuditLog');
const { expenseSchema } = require('../validators/expenseValidator');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// List all expenses
router.get(
  '/',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res, next) => {
    try {
      const companyId = req.user.companyId;
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
  const { error, value } = expenseSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    error.status = 400;
    return next(error);
  }

  try {
    const expense = await withAuditLog(
      {
        action: 'expense_create',
        resourceType: 'Expense',
        resourceId: null,
        userId: req.userId,
        oldValues: null,
        newValues: value,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      async () => expenseService.createExpense(value, req.userId, req.companyId),
    );
    res.status(201).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
});

// Patch expense status (status transition)
router.patch('/:expenseId/status', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const { status } = req.body;
    const oldExpense = await expenseService.getExpenseById(req.params.expenseId, req.companyId);
    const expense = await withAuditLog(
      {
        action: 'expense_status_change',
        resourceType: 'Expense',
        resourceId: req.params.expenseId,
        userId: req.userId,
        oldValues: oldExpense,
        newValues: { status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      async () => expenseService.updateExpenseStatus(req.params.expenseId, status, req.companyId),
    );

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: 'Expense not found or invalid status transition' });
    }

    res.status(200).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
