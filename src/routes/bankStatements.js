const express = require('express');
const router = express.Router();
const { authenticate, requireCompany } = require('../middleware/authMiddleware');
const bankStatementService = require('../services/bankStatementService');
const { withAuditLog } = require('../services/withAuditLog');
const { BankStatement, BankTransaction } = require('../models');
const { createSecureUploader, logUploadMetadata } = require('../middleware/secureUpload');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const upload = createSecureUploader({
  subDir: 'bank-statements',
  maxSize: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: ['text/csv', 'text/plain', 'application/xml'],
  allowedExtensions: ['.csv', '.txt', '.xml'],
});

const SUPPORTED_FORMATS = ['CSV', 'MT940', 'CAMT053'];

router.use(authenticate);
router.use(requireCompany);

/**
 * ─────────────────────────────────────────────────────────
 * Import Bank Statement
 * ─────────────────────────────────────────────────────────
 */
router.post(
  '/import',
  logUploadMetadata,
  upload.single('bankStatement'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const { format } = req.body;
      if (!format || !SUPPORTED_FORMATS.includes(format.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing format',
        });
      }

      const formatNormalized = format.toUpperCase();
      const importOperation = async () => bankStatementService.importBankStatement(
        req.companyId,
        req.file.path,
        req.file.originalname,
        formatNormalized,
      );

      const result = await withAuditLog({
        action: 'BANK_STATEMENT_IMPORTED',
        resourceType: 'BankStatement',
        resourceId: (payload) => payload?.bankStatement?.id ? String(payload.bankStatement.id) : null,
        userId: req.user.id,
        oldValues: null,
        newValues: (payload) => ({
          fileName: req.file.originalname,
          format: formatNormalized,
          imported: payload?.summary?.totalImported,
          processed: payload?.summary?.totalProcessed,
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        reason: 'Imported a bank statement',
      }, importOperation);

      return res.json({
        success: true,
        message: 'Bank statement imported successfully',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to import bank statement',
      });
    }
  },
);

/**
 * ─────────────────────────────────────────────────────────
 * List Bank Statements
 * ─────────────────────────────────────────────────────────
 */
router.get('/', async (req, res) => {
  try {
    const pagination = getPagination(req.query);
    const statements = await BankStatement.findAndCountAll({
      where: { companyId: req.companyId },
      order: [['importDate', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.json({
      success: true,
      data: statements.rows,
      pagination: buildPaginationMeta({
        total: statements.count,
        ...pagination,
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statements',
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────
 * List Transactions for a Statement
 * ─────────────────────────────────────────────────────────
 */
router.get('/:id/transactions', async (req, res) => {
  try {
    const pagination = getPagination(req.query);
    const transactions = await BankTransaction.findAndCountAll({
      where: {
        companyId: req.companyId,
        bankStatementId: req.params.id,
      },
      order: [['transactionDate', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.json({
      success: true,
      data: transactions.rows,
      pagination: buildPaginationMeta({
        total: transactions.count,
        ...pagination,
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bank transactions',
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────
 * Reconcile Transactions
 * ─────────────────────────────────────────────────────────
 */
router.post('/reconcile', async (req, res) => {
  try {
    const reconciled = await withAuditLog({
      action: 'BANK_TRANSACTIONS_RECONCILED',
      resourceType: 'BankTransaction',
      resourceId: () => String(req.companyId),
      userId: req.user.id,
      oldValues: null,
      newValues: (payload) => ({ reconciledCount: payload?.length || 0 }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      reason: 'Reconciled bank transactions',
    }, async () => bankStatementService.reconcileTransactions(req.companyId));

    return res.json({
      success: true,
      message: 'Reconciliation completed',
      data: {
        reconciledCount: reconciled.length,
        transactions: reconciled,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reconcile transactions',
    });
  }
});

/**
 * ─────────────────────────────────────────────────────────
 * Categorize / Update Transaction
 * ─────────────────────────────────────────────────────────
 */
router.put('/transactions/:id/categorize', async (req, res) => {
  try {
    const { category, vatCategory, isReconciled } = req.body;

    const transaction = await BankTransaction.findOne({
      where: {
        id: req.params.id,
        companyId: req.companyId,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const updates = {};
    if (category !== undefined) {
      updates.category = category;
    }
    if (vatCategory !== undefined) {
      updates.vatCategory = vatCategory;
    }
    if (isReconciled !== undefined) {
      updates.isReconciled = isReconciled;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update fields provided',
      });
    }

    const beforeValues = {
      category: transaction.category,
      vatCategory: transaction.vatCategory,
      isReconciled: transaction.isReconciled,
    };
    const updatedTransaction = await withAuditLog({
      action: 'BANK_TRANSACTION_UPDATED',
      resourceType: 'BankTransaction',
      resourceId: String(transaction.id),
      userId: req.user.id,
      oldValues: beforeValues,
      newValues: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      reason: 'Categorized bank transaction',
    }, async () => transaction.update(updates));

    return res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to categorize transaction',
    });
  }
});

module.exports = router;
