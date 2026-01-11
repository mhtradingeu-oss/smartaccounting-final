const express = require('express');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { FileAttachment, Company } = require('../models');
const ocrService = require('../services/ocrService');
const { runOCRPreview } = ocrService;
const AuditLogService = require('../services/auditLogService');
const { authenticate, requireCompany, requireRole } = require('../middleware/authMiddleware');
const logger = require('../lib/logger');
const { sendSuccess, sendError } = require('../utils/responseHelpers');
const { ocrLimiter } = require('../middleware/rateLimiter');
const {
  createSecureUploader,
  logUploadMetadata,
  validateUploadedFile,
} = require('../middleware/secureUpload');
const { analyzeDocument, classifyDocumentType } = require('../services/documentAnalysisService');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');

const router = express.Router();
const upload = createSecureUploader({
  subDir: 'ocr',
  maxSize: 25 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'],
  allowedExtensions: ['.jpeg', '.jpg', '.png', '.tiff', '.pdf'],
});

router.use(ocrLimiter);
router.use(authenticate);
router.use(requireCompany);
router.use(logUploadMetadata);

const ensureCompanyInGoodStanding = async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.companyId);
    if (!company) {
      await AuditLogService.appendEntry({
        action: 'ocr_blocked_company_missing',
        resourceType: 'Company',
        resourceId: req.companyId ? String(req.companyId) : null,
        userId: req.userId,
        reason: 'Company not found',
      });
      return sendError(res, 'Company not found.', 404);
    }
    if (!company.isActive || company.suspendedAt) {
      await AuditLogService.appendEntry({
        action: 'ocr_blocked_company',
        resourceType: 'Company',
        resourceId: String(company.id),
        userId: req.userId,
        reason: 'Company suspended or inactive',
        oldValues: { isActive: company.isActive, suspendedAt: company.suspendedAt },
      });
      return sendError(res, 'Company is suspended or inactive.', 403);
    }
    const subscriptionStatus = (company.subscriptionStatus || '').toLowerCase();
    if (!['active', 'demo'].includes(subscriptionStatus)) {
      await AuditLogService.appendEntry({
        action: 'ocr_blocked_subscription',
        resourceType: 'Company',
        resourceId: String(company.id),
        userId: req.userId,
        reason: 'Subscription required',
        oldValues: { subscriptionStatus: company.subscriptionStatus || null },
      });
      return sendError(res, 'An active subscription is required to use OCR.', 402);
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

router.use(ensureCompanyInGoodStanding);

const validateDocument = [
  body('documentType')
    .optional()
    .isIn(['invoice', 'receipt', 'bank_statement', 'tax_document', 'auto'])
    .withMessage('Unsupported document type'),
];

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Invalid input', 400, errors.array());
  }
  return null;
};

const OCR_PREVIEW_ENABLED =
  String(process.env.OCR_PREVIEW_ENABLED || 'false').toLowerCase() === 'true';

const previewHandler = async (req, res) => {
  if (handleValidation(req, res)) {
    return;
  }

  if (!req.file) {
    return sendError(res, 'No document uploaded', 400);
  }

  const fileCheck = validateUploadedFile(req.file.path, ['pdf', 'png', 'jpg', 'tiff']);
  if (!fileCheck.valid) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return sendError(res, `Unsupported file content. ${fileCheck.reason}`, 400);
  }
  const ext = req.file.originalname.toLowerCase().split('.').pop();
  const extensionMap = {
    pdf: ['pdf'],
    png: ['png'],
    jpg: ['jpg', 'jpeg'],
    tiff: ['tiff'],
  };
  const expectedExts = extensionMap[fileCheck.detected] || [];
  if (expectedExts.length && !expectedExts.includes(ext)) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return sendError(
      res,
      `File extension does not match detected content (${fileCheck.detected}).`,
      400,
    );
  }

  const requestedType = req.body.documentType || 'auto';
  const documentType = requestedType === 'auto' ? 'invoice' : requestedType;

  try {
    const previewResult = await runOCRPreview(req.file.path, {
      documentType,
      userId: req.userId,
      companyId: req.companyId,
    });

    if (!previewResult.success) {
      throw new Error(previewResult.error || 'OCR preview failed');
    }

    const previewFields = previewResult.fields || previewResult.extractedData;
    const classifiedType =
      requestedType === 'auto'
        ? classifyDocumentType(previewResult.text || '') || documentType
        : documentType;
    const analysis = analyzeDocument({
      text: previewResult.text,
      extractedData: previewFields,
      documentType: classifiedType,
    });

    await AuditLogService.appendEntry({
      action: 'ocr_preview',
      resourceType: 'ocr_preview',
      resourceId: null,
      userId: req.userId,
      reason: 'Document previewed via OCR preview mode',
      newValues: {
        documentType,
        confidence: previewResult.confidence,
        fields: previewFields,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
    });

    return sendSuccess(res, 'OCR preview generated', {
      type: classifiedType,
      confidence: previewResult.confidence,
      fields: previewFields,
      warnings: previewResult.warnings || [],
      explanations: previewResult.explanations || [],
      rawText: previewResult.text,
      analysis,
    });
  } catch (error) {
    logger.error('OCR preview failed', { error: error.message });
    return sendError(res, 'Unable to generate OCR preview', 500);
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

if (OCR_PREVIEW_ENABLED) {
  router.post(
    '/preview',
    requireRole(['viewer']),
    upload.single('document'),
    validateDocument,
    previewHandler,
  );
} else {
  router.all('/preview', disabledFeatureHandler('OCR preview'));
  // Explicitly block unsupported methods for OCR preview endpoint
}

router.post(
  '/process',
  requireRole(['accountant']),
  upload.single('document'),
  validateDocument,
  async (req, res) => {
    if (handleValidation(req, res)) {
      return;
    }

    if (!req.file) {
      return sendError(res, 'No document uploaded', 400);
    }

    try {
      const fileCheck = validateUploadedFile(req.file.path, ['pdf', 'png', 'jpg', 'tiff']);
      if (!fileCheck.valid) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, `Unsupported file content. ${fileCheck.reason}`, 400);
      }
      const ext = req.file.originalname.toLowerCase().split('.').pop();
      const extensionMap = {
        pdf: ['pdf'],
        png: ['png'],
        jpg: ['jpg', 'jpeg'],
        tiff: ['tiff'],
      };
      const expectedExts = extensionMap[fileCheck.detected] || [];
      if (expectedExts.length && !expectedExts.includes(ext)) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(
          res,
          `File extension does not match detected content (${fileCheck.detected}).`,
          400,
        );
      }

      const requestedType = req.body.documentType || 'auto';
      const documentType = requestedType === 'auto' ? 'invoice' : requestedType;

      const ocrResult = await ocrService.processDocument(req.file.path, {
        documentType,
        userId: req.userId,
        companyId: req.companyId,
        originalName: req.file.originalname,
        uploadedBy: req.userId,
      });

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'OCR processing failed');
      }

      let extractedData = ocrResult.extractedData;
      let effectiveType = documentType;
      if (requestedType === 'auto') {
        effectiveType = classifyDocumentType(ocrResult.text || '') || documentType;
        extractedData = await ocrService.extractStructuredData(ocrResult.text, effectiveType);
      }

      const analysis = analyzeDocument({
        text: ocrResult.text,
        extractedData,
        documentType: effectiveType,
      });

      const documentRecord = await FileAttachment.findByPk(ocrResult.documentId);
      if (documentRecord) {
        await documentRecord.update({
          processingStatus: analysis.compliance.status,
          extractedData: {
            ...extractedData,
            analysis,
          },
        });
      }

      return sendSuccess(res, 'Document processed', {
        document: documentRecord,
        ocrResult: { ...ocrResult, extractedData },
        analysis,
      });
    } catch (error) {
      logger.error('OCR processing failed', { error: error.message });
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return sendError(res, 'Unable to process document', 500);
    }
  },
);

router.get('/results/:fileId', async (req, res) => {
  try {
    const file = await FileAttachment.findOne({
      where: { id: req.params.fileId, companyId: req.companyId },
    });

    if (!file) {
      return sendError(res, 'Document not found', 404);
    }

    return sendSuccess(res, 'Document retrieved', { document: file });
  } catch (error) {
    logger.error('OCR results fetch failed', { error: error.message });
    return sendError(res, 'Failed to fetch OCR results', 500);
  }
});

router.post('/reprocess/:fileId', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const file = await FileAttachment.findOne({
      where: { id: req.params.fileId, companyId: req.companyId },
    });

    if (!file) {
      return sendError(res, 'Document not found', 404);
    }

    const ocrResult = await ocrService.processDocument(file.filePath, {
      documentType: file.documentType || 'invoice',
      userId: req.userId,
      companyId: req.companyId,
    });

    await file.update({
      processingStatus: ocrResult.success ? 'processed' : 'failed',
      ocrText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
      extractedData: ocrResult.extractedData,
    });

    return sendSuccess(res, 'Document reprocessed', { ocrResult });
  } catch (error) {
    logger.error('OCR reprocessing failed', { error: error.message });
    return sendError(res, 'Reprocessing failed', 500);
  }
});

router.get('/search', async (req, res) => {
  try {
    const criteria = {
      companyId: req.companyId,
      ...req.query,
    };
    const documents = await ocrService.searchDocuments(criteria);
    return sendSuccess(res, 'Documents found', { count: documents.length, documents });
  } catch (error) {
    logger.error('OCR search failed', { error: error.message });
    return sendError(res, 'Search failed', 500);
  }
});

router.get('/validate/:documentId', async (req, res) => {
  try {
    const file = await FileAttachment.findOne({
      where: { id: req.params.documentId, companyId: req.companyId },
    });

    if (!file) {
      return sendError(res, 'Document not found', 404);
    }

    const validation = await ocrService.validateDocumentIntegrity(file.id);
    return sendSuccess(res, 'Document validated', { validation });
  } catch (error) {
    logger.error('OCR validation failed', { error: error.message });
    return sendError(res, 'Validation failed', 500);
  }
});

module.exports = router;
