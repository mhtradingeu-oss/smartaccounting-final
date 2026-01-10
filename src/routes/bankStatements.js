const express = require('express');
const fs = require('fs');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const bankStatementService = require('../services/bankStatementService');
const AuditLogService = require('../services/auditLogService');
const logger = require('../lib/logger');
const { BankStatement, BankTransaction } = require('../models');
const { createSecureUploader, logUploadMetadata, validateUploadedFile } = require('../middleware/secureUpload');

const router = express.Router();

const upload = createSecureUploader({
  subDir: 'bank-statements',
  maxSize: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: [
    'text/csv',
    'text/plain',
    'application/xml',
    'application/pdf',
    'image/png',
    'image/jpeg',
  ],
  allowedExtensions: ['.csv', '.txt', '.xml', '.mt940', '.camt053', '.pdf', '.png', '.jpg', '.jpeg'],
});

const SUPPORTED_FORMATS = ['CSV', 'MT940', 'CAMT053', 'OCR'];

const inferFormat = (fileName = '', detectedType = '') => {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'txt') {
    return 'CSV';
  }
  if (ext === 'mt940') {
    return 'MT940';
  }
  if (ext === 'xml' || ext === 'camt053') {
    return 'CAMT053';
  }
  if (ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    return 'OCR';
  }
  if (['pdf', 'png', 'jpg', 'tiff'].includes(detectedType)) {
    return 'OCR';
  }
  return null;
};

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

      const signatureCheck = validateUploadedFile(req.file.path, ['text', 'xml', 'pdf', 'png', 'jpg']);
      if (!signatureCheck.valid) {
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // Ignore cleanup failures.
          }
        }
        return res.status(400).json({
          success: false,
          message: `Unsupported file content. ${signatureCheck.reason}`,
        });
      }

      const ext = req.file.originalname.toLowerCase().split('.').pop();
      const extensionMap = {
        pdf: ['pdf'],
        png: ['png'],
        jpg: ['jpg', 'jpeg'],
        xml: ['xml', 'camt053'],
        text: ['csv', 'txt', 'mt940'],
      };
      const expectedExts = extensionMap[signatureCheck.detected] || [];
      if (expectedExts.length && !expectedExts.includes(ext)) {
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {
            // Ignore cleanup failures.
          }
        }
        return res.status(400).json({
          success: false,
          message: `File extension does not match detected content (${signatureCheck.detected}).`,
        });
      }

      const rawFormat = req.body?.format;
      const detectedFormat = inferFormat(req.file.originalname, signatureCheck.detected);
      const format = (rawFormat || detectedFormat || '').toUpperCase();
      if (!format || !SUPPORTED_FORMATS.includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing format',
        });
      }

      if (isDryRunRequest(req)) {
        const result = await bankStatementService.dryRunImportBankStatement(
          req.companyId,
          req.file.path,
          format,
        );

        const dryRunRecord = await bankStatementService.registerDryRun({
          companyId: req.companyId,
          userId: req.user?.id,
          filePath: req.file.path,
          fileName: req.file.originalname,
          format,
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
          dryRunId: dryRunRecord.id,
          success: true,
          mode: 'dry-run',
          summary: result.summary,
          matches: result.matches,
          unmatched: result.unmatched,
          warnings: result.warnings,
          explanations: result.explanations || [],
        });
      }

      const result = await bankStatementService.importBankStatement(
        req.companyId,
        req.file.path,
        req.file.originalname,
        format,
        { userId: req.user?.id },
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
    const { dryRunId } = req.body || {};
    if (!dryRunId) {
      return res.status(400).json({
        success: false,
        message: 'dryRunId is required',
      });
    }

    const transaction = await BankStatement.sequelize.transaction();
    try {
      const dryRunRecord = await bankStatementService.getDryRunById({
        dryRunId,
        companyId: req.companyId,
        transaction,
      });
      if (!dryRunRecord) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Dry run not found',
        });
      }
      const { summary, bankStatement } = await bankStatementService.confirmDryRunImport({
        dryRunId,
        companyId: req.companyId,
        transaction,
      });

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
