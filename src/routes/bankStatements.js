const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const bankStatementService = require('../services/bankStatementService');
const { BankStatement, BankTransaction } = require('../models');
const { createSecureUploader, logUploadMetadata } = require('../middleware/secureUpload');

const upload = createSecureUploader({
  subDir: 'bank-statements',
  maxSize: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: ['text/csv', 'text/plain', 'application/xml'],
  allowedExtensions: ['.csv', '.txt', '.xml'],
});

const SUPPORTED_FORMATS = ['CSV', 'MT940', 'CAMT053'];

/**
 * ─────────────────────────────────────────────────────────
 * Import Bank Statement
 * ─────────────────────────────────────────────────────────
 */
router.post(
  '/import',
  authenticate,
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

      const result = await bankStatementService.importBankStatement(
        req.companyId,
        req.file.path,
        req.file.originalname,
        format.toUpperCase(),
      );

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
router.get('/', authenticate, async (req, res) => {
  try {
    const statements = await BankStatement.findAll({
      where: { companyId: req.companyId },
      order: [['importDate', 'DESC']],
    });

    return res.json({
      success: true,
      data: statements,
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
router.get('/:id/transactions', authenticate, async (req, res) => {
  try {
    const transactions = await BankTransaction.findAll({
      where: {
        companyId: req.companyId,
        bankStatementId: req.params.id,
      },
      order: [['transactionDate', 'DESC']],
    });

    return res.json({
      success: true,
      data: transactions,
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
router.post('/reconcile', authenticate, async (req, res) => {
  try {
    const reconciled = await bankStatementService.reconcileTransactions(req.companyId);

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
router.put('/transactions/:id/categorize', authenticate, async (req, res) => {
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

    const updatedTransaction = await transaction.update(updates);

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
