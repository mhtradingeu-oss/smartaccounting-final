const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const bankStatementService = require('../services/bankStatementService');
const AuditLogService = require('../services/auditLogService');
const logger = require('../lib/logger');
const { BankStatement, BankTransaction } = require('../models');
const { createSecureUploader, logUploadMetadata } = require('../middleware/secureUpload');

const upload = createSecureUploader({
  subDir: 'bank-statements',
  maxSize: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: ['text/csv', 'text/plain', 'application/xml'],
  allowedExtensions: ['.csv', '.txt', '.xml'],
});

const SUPPORTED_FORMATS = ['CSV', 'MT940', 'CAMT053'];

const isDryRunRequest = (req) => {
  const dryRunFlag = (req?.query?.dryRun || '').toString().toLowerCase();
  return dryRunFlag === 'true' || dryRunFlag === '1';
};

const isBankImportEnabled = () =>
  String(process.env.BANK_IMPORT_ENABLED || 'false').toLowerCase() === 'true';

const ensureBankImportEnabled = async (req, res, next) => {
  if (isDryRunRequest(req)) {
    return next();
  }

  if (isBankImportEnabled()) {
    return next();
  }

  const blockedAt = new Date().toISOString();
  const actorId = req.user?.id;
  const actorEmail = req.user?.email || 'unknown';
  const companyId = req.companyId || null;

  logger.warn('Bank statement import blocked while feature flag disabled', {
    userId: actorId,
    userEmail: actorEmail,
    companyId,
    blockedAt,
  });

  try {
    await AuditLogService.appendEntry({
      action: 'bank_import_blocked',
      resourceType: 'BankStatementImport',
      resourceId: companyId ? String(companyId) : null,
      userId: actorId,
      reason: 'Bank import gate enforced',
      oldValues: {
        flag: 'BANK_IMPORT_ENABLED',
        value: process.env.BANK_IMPORT_ENABLED || 'false',
      },
    });
  } catch (auditError) {
    return next(auditError);
  }

  return res.status(503).json({
    error: 'IMPORT_DISABLED',
    message: 'Bank statement import is currently disabled.',
  });
};

/**
 * ─────────────────────────────────────────────────────────
 * Import Bank Statement
 * ─────────────────────────────────────────────────────────
 */
  router.post(
    '/import',
    authenticate,
    requireRole(['admin', 'accountant']),
    ensureBankImportEnabled,
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

      const formatCode = format.toUpperCase();
      if (isDryRunRequest(req)) {
        const result = await bankStatementService.dryRunImportBankStatement(
          req.companyId,
          req.file.path,
          formatCode,
        );

        const dryRunRecord = await bankStatementService.registerDryRun({
          companyId: req.companyId,
          userId: req.user?.id,
          filePath: req.file.path,
          fileName: req.file.originalname,
          format: formatCode,
          summary: result.summary,
          matchesCount: result.matches.length,
          unmatchedCount: result.unmatched.length,
          warningsCount: result.warnings.length,
        });

        await AuditLogService.appendEntry({
          action: 'bank_import_dry_run',
          resourceType: 'BankStatementImport',
          resourceId: req.companyId ? String(req.companyId) : null,
          userId: req.user?.id,
          oldValues: null,
          newValues: {
            dryRun: true,
            summary: result.summary,
            matches: result.matches.length,
            unmatched: result.unmatched.length,
            warnings: result.warnings.length,
          },
          reason: 'Dry run bank statement import executed',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        return res.json({
          confirmationToken: dryRunRecord.confirmationToken,
          dryRunId: dryRunRecord.id,
          success: true,
          mode: 'dry-run',
          summary: result.summary,
          matches: result.matches,
          unmatched: result.unmatched,
          warnings: result.warnings,
        });
      }

      const result = await bankStatementService.importBankStatement(
        req.companyId,
        req.file.path,
        req.file.originalname,
        formatCode,
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

router.post(
  '/import/confirm',
  authenticate,
  requireRole(['admin', 'accountant']),
  ensureBankImportEnabled,
  async (req, res) => {
    const { confirmationToken } = req.body || {};
    if (!confirmationToken) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation token is required',
      });
    }

    const transaction = await BankStatement.sequelize.transaction();
    try {
      const { dryRunId, summary, bankStatement } = await bankStatementService.confirmDryRunImport(
        {
          confirmationToken,
          companyId: req.companyId,
          transaction,
        },
      );

      await AuditLogService.appendEntry({
        action: 'bank_import_confirmed',
        resourceType: 'BankStatementImport',
        resourceId: req.companyId ? String(req.companyId) : null,
        userId: req.user?.id,
        oldValues: null,
        newValues: {
          dryRunId,
          bankStatementId: bankStatement.id,
          counts: summary,
        },
        reason: 'Bank statement import confirmed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        transaction,
      });

      await transaction.commit();

      return res.json({
        success: true,
        message: 'Bank statement import confirmed',
        data: {
          dryRunId,
          bankStatementId: bankStatement.id,
          summary,
        },
      });
    } catch (error) {
      await transaction.rollback();
      const status = error.status || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to confirm bank statement import',
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

router.get('/:id/audit-logs', authenticate, async (req, res) => {
  try {
    const logs = await bankStatementService.getAuditLogEntriesForStatement({
      statementId: Number(req.params.id),
      companyId: req.companyId,
    });

    return res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to fetch audit log',
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

router.post(
  '/transactions/:id/reconcile',
  authenticate,
  requireRole(['admin', 'accountant']),
  async (req, res) => {
    try {
      const { targetType, targetId, reason } = req.body || {};
      const result = await bankStatementService.reconcileBankTransaction({
        bankTransactionId: Number(req.params.id),
        targetType,
        targetId,
        reason,
        companyId: req.companyId,
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.json({
        success: true,
        data: result.bankTransaction,
      });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to reconcile bank transaction',
      });
    }
  },
);

router.post(
  '/transactions/:id/reconcile/undo',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { reason } = req.body || {};
      const result = await bankStatementService.undoManualReconciliation({
        bankTransactionId: Number(req.params.id),
        companyId: req.companyId,
        userId: req.user?.id,
        reason,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.json({
        success: true,
        data: result.bankTransaction,
      });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to undo reconciliation',
      });
    }
  },
);

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
