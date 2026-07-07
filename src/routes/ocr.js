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
const documentIntakeAssistantService = require('../services/ai/documentIntakeAssistantService');
const {
  createAiProposalBundle,
  summarizeAiProposalBundle,
} = require('../services/ai/aiProposalService');
const { persistApprovalQueueItem } = require('../services/ai/aiApprovalQueueRepository');
const expenseService = require('../services/expenseService');
const invoiceService = require('../services/invoiceService');
const reviewedDocumentDraftService = require('../services/ai/reviewedDocumentDraftService');
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
  body('languageHint')
    .optional()
    .isIn(['auto', 'de', 'en', 'ar'])
    .withMessage('Unsupported language hint'),
  body('userHint').optional().isString().isLength({ max: 1000 }),
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

const validateOcrUpload = (req, res) => {
  const fileCheck = validateUploadedFile(req.file.path, ['pdf', 'png', 'jpg', 'tiff']);
  if (!fileCheck.valid) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    sendError(res, `Unsupported file content. ${fileCheck.reason}`, 400);
    return null;
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
    sendError(
      res,
      `File extension does not match detected content (${fileCheck.detected}).`,
      400,
    );
    return null;
  }
  return fileCheck;
};

const getJsonObject = (value) => {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value || '{}');
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const isNonEmptyPlainObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

const buildDocumentInboxItem = (documentRecord) => {
  const extractedData = getJsonObject(documentRecord.extractedData);
  const intake = getJsonObject(extractedData.intake);
  const reviewState = getJsonObject(intake.reviewState);
  const draftEligibility = getJsonObject(intake.draftEligibility);
  const accountingDecision = intake.accountingDecision || intake.lifecycle?.accountingDecision || null;
  const editablePayload = getJsonObject(intake.editablePayload);
  const manualOverride = editablePayload.manualOverride || intake.manualOverride || intake.lifecycle?.manualOverride || null;
  const draftCreation = getJsonObject(intake.draftCreation);

  return {
    id: documentRecord.id,
    originalName: documentRecord.originalName,
    fileName: documentRecord.fileName,
    mimeType: documentRecord.mimeType,
    fileSize: documentRecord.fileSize,
    fileHash: documentRecord.fileHash,
    documentType: documentRecord.documentType || intake.classification?.documentType || null,
    processingStatus: documentRecord.processingStatus,
    ocrConfidence: documentRecord.ocrConfidence,
    uploadedAt: documentRecord.createdAt,
    updatedAt: documentRecord.updatedAt,
    classification: intake.classification || null,
    reviewState: isNonEmptyPlainObject(reviewState) ? reviewState : null,
    draftEligibility: isNonEmptyPlainObject(draftEligibility) ? draftEligibility : null,
    accountingDecision,
    decisionFingerprint: intake.decisionFingerprint || intake.lifecycle?.decisionFingerprint || null,
    draftCreation: isNonEmptyPlainObject(draftCreation) ? draftCreation : null,
    manualOverride: isNonEmptyPlainObject(manualOverride) ? manualOverride : null,
    vatTreatment: accountingDecision?.vatTreatment || editablePayload.reviewedValues?.taxTreatment || null,
    inputVatAllowed:
      accountingDecision?.inputVatAllowed ??
      editablePayload.reviewedValues?.inputVatAllowed ??
      null,
    accountantReviewRequired:
      accountingDecision?.accountantReviewRequired ??
      editablePayload.reviewedValues?.accountantReviewRequired ??
      null,
  };
};

const OCR_DRAFT_ACTION_TOOL_IDS = Object.freeze({
  create_expense_draft: 'create_expense_draft_from_reviewed_document',
  create_invoice_draft: 'create_invoice_draft_from_reviewed_document',
});

const buildOcrActionProposalMetadata = ({ req, documentRecord, intake } = {}) => {
  const suggestedAction = intake?.classification?.suggestedAction;
  const toolId = OCR_DRAFT_ACTION_TOOL_IDS[suggestedAction];

  if (!toolId) {
    return {
      actionProposal: null,
      approvalQueueItem: null,
      proposalSummary: null,
    };
  }

  const draftKind = suggestedAction === 'create_invoice_draft' ? 'invoice' : 'expense';
  const preview =
    intake?.editablePayload?.reviewedValues ||
    intake?.editablePayload?.aiExtractedValues ||
    intake?.extracted ||
    {};

  const documentType =
    intake?.classification?.documentType ||
    documentRecord?.documentType ||
    'document';

  const bundle = createAiProposalBundle({
    toolId,
    summary: `Prepare ${draftKind} draft proposal from OCR intake for reviewed document values.`,
    preview,
    evidence: [
      {
        source: 'ocr_intake',
        documentId: documentRecord?.id || null,
        documentType,
        suggestedAction,
      },
    ],
    reason:
      'OCR intake returned a draft suggestion that requires reviewed values and human approval before draft creation.',
    requestedBy: 'ai_document_intake',
    requestedByUserId: req?.userId || null,
    companyId: req?.companyId || documentRecord?.companyId || null,
    metadata: {
      source: 'ocr_intake',
      requestId: req?.requestId || null,
      documentId: documentRecord?.id || null,
      documentType,
      suggestedAction,
      responseOnly: true,
      execution: 'none',
    },
  });

  return {
    actionProposal: bundle.proposal || null,
    approvalQueueItem: bundle.approvalQueueItem || null,
    proposalSummary: summarizeAiProposalBundle(bundle),
  };
};
const persistOcrApprovalQueueMetadata = async (metadata = {}) => {
  const approvalQueueItem = metadata.approvalQueueItem || null;

  if (!approvalQueueItem) {
    return {
      ...metadata,
      approvalQueuePersistence: {
        persisted: false,
        created: false,
        approvalId: null,
        error: null,
        reason: 'no_approval_queue_item',
      },
    };
  }

  try {
    const persistence = await persistApprovalQueueItem({ item: approvalQueueItem });

    return {
      ...metadata,
      approvalQueuePersistence: {
        persisted: persistence.persisted === true,
        created: persistence.created === true,
        approvalId:
          persistence.item?.approvalId ||
          approvalQueueItem.approvalId ||
          approvalQueueItem.id ||
          null,
        error: persistence.error || null,
        reason: persistence.persisted
          ? 'persisted_read_only_queue_item'
          : 'persistence_rejected',
      },
    };
  } catch (error) {
    return {
      ...metadata,
      approvalQueuePersistence: {
        persisted: false,
        created: false,
        approvalId: approvalQueueItem.approvalId || approvalQueueItem.id || null,
        error: error.message || 'Unable to persist approval queue item.',
        reason: 'persistence_error',
      },
    };
  }
};


const buildIntakeResponse = ({ req, documentRecord, intake }) => ({
  requestId: req.requestId || null,
  document: {
    id: documentRecord.id,
    originalName: documentRecord.originalName,
    mimeType: documentRecord.mimeType,
    fileSize: documentRecord.fileSize,
    fileHash: documentRecord.fileHash,
    documentType: documentRecord.documentType,
    processingStatus: documentRecord.processingStatus,
    ocrConfidence: documentRecord.ocrConfidence,
  },
  classification: intake.classification,
  extracted: intake.extracted,
  reviewState: intake.reviewState,
  editablePayload: intake.editablePayload,
  draftEligibility: intake.draftEligibility,
  accountingDecision: intake.accountingDecision || intake.lifecycle?.accountingDecision || null,
  decisionFingerprint: intake.decisionFingerprint || intake.lifecycle?.decisionFingerprint || null,
  lifecycle: intake.lifecycle,
  validation: intake.validation,
  draft: intake.draft,
  audit: intake.audit,
  ...buildOcrActionProposalMetadata({ req, documentRecord, intake }),
});

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
  '/intake/analyze',
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
      const fileCheck = validateOcrUpload(req, res);
      if (!fileCheck) {
        return;
      }

      const requestedType = req.body.documentType || 'auto';
      const documentType = requestedType === 'auto' ? 'invoice' : requestedType;

      const isPdfDocument =
        req.file.mimetype === 'application/pdf' ||
        String(req.file.originalname || '').toLowerCase().endsWith('.pdf');

      if (isPdfDocument) {
        const pdfTextResult = await ocrService.extractPdfText(req.file.path);
        const pdfText = String(pdfTextResult.text || '').trim();

        if (pdfText.length >= 20) {
          const effectiveType =
            requestedType === 'auto' ? classifyDocumentType(pdfText) || documentType : documentType;
          const extractedData = await ocrService.extractStructuredData(pdfText, effectiveType);
          const intake = documentIntakeAssistantService.analyzeIntake({
            text: pdfText,
            extractedData,
            documentType: requestedType === 'auto' ? 'auto' : effectiveType,
            documentId: null,
            userHint: req.body.userHint,
          });

          const documentRecord = await FileAttachment.create({
            originalName: req.file.originalname,
            fileName: req.file.filename || req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            documentType: intake.classification.documentType,
            userId: req.userId,
            companyId: req.companyId,
            uploadedBy: req.userId,
            ocrText: pdfText,
            ocrConfidence: null,
            processingStatus: intake.validation.status,
            extractedData: {
              ...extractedData,
              pdfTextExtraction: {
                pages: pdfTextResult.pages || null,
                digitalText: true,
              },
              intake,
            },
          });

          await AuditLogService.appendEntry({
            action: 'ocr_intake_analyze_pdf_text',
            resourceType: 'FileAttachment',
            resourceId: String(documentRecord.id),
            userId: req.userId,
            companyId: req.companyId,
            reason: 'AI document intake analyzed extractable PDF text for advisory draft suggestion',
            newValues: {
              documentType: intake.classification.documentType,
              suggestedAction: intake.classification.suggestedAction,
              advisoryOnly: true,
              requiresHumanConfirmation: true,
              pdfTextExtraction: true,
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || null,
          });

          return sendSuccess(res, 'Document intake analyzed', {
            requestId: req.requestId || null,
            document: {
              id: documentRecord.id,
              originalName: documentRecord.originalName,
              mimeType: documentRecord.mimeType,
              fileSize: documentRecord.fileSize,
              fileHash: documentRecord.fileHash,
              documentType: documentRecord.documentType,
              processingStatus: documentRecord.processingStatus,
              ocrConfidence: null,
            },
            ocr: {
              rawText: pdfText,
              languageDetected: req.body.languageHint || 'auto',
              confidence: null,
            },
            classification: intake.classification,
            extracted: intake.extracted,
            reviewState: intake.reviewState,
            editablePayload: intake.editablePayload,
            draftEligibility: intake.draftEligibility,
            accountingDecision: intake.accountingDecision || intake.lifecycle?.accountingDecision || null,
            lifecycle: intake.lifecycle,
            validation: intake.validation,
            draft: intake.draft,
            audit: intake.audit,
            ...(await persistOcrApprovalQueueMetadata(buildOcrActionProposalMetadata({ req, documentRecord, intake }))),
          });
        }

        const reviewGate = documentIntakeAssistantService.buildReviewGate({
          aiExtractedValues: {},
        });
        const documentRecord = await FileAttachment.create({
          originalName: req.file.originalname,
          fileName: req.file.filename || req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          documentType: 'pdf',
          userId: req.userId,
          companyId: req.companyId,
          uploadedBy: req.userId,
          processingStatus: 'needs_review',
          extractedData: {
            intake: {
              classification: {
                documentType: 'pdf',
                suggestedAction: 'ask_missing_data',
                confidence: 'low',
              },
              extracted: {},
              ...reviewGate,
              validation: {
                status: 'needs_review',
                errors: ['PDF OCR is not available in this local runtime.'],
                warnings: [
                  'Upload a clear image of the document or enable PDF conversion/text extraction support.',
                  'No invoice, expense, bank transaction, posting, approval, deletion, or reconciliation was created.',
                ],
                missingFields: ['readableDocumentImage'],
              },
              draft: null,
              audit: {
                advisoryOnly: true,
                requiresHumanConfirmation: true,
                blockedActions: ['post', 'approve', 'delete', 'reconcile'],
              },
            },
          },
        });

        await AuditLogService.appendEntry({
          action: 'ocr_intake_analyze_pdf_unsupported',
          resourceType: 'FileAttachment',
          resourceId: String(documentRecord.id),
          userId: req.userId,
          companyId: req.companyId,
          reason: 'AI document intake received PDF but local PDF OCR conversion is not enabled',
          newValues: {
            documentType: 'pdf',
            suggestedAction: 'ask_missing_data',
            advisoryOnly: true,
            requiresHumanConfirmation: true,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
        });

        return sendSuccess(res, 'Document intake analyzed with review required', {
          requestId: req.requestId || null,
          document: {
            id: documentRecord.id,
            originalName: documentRecord.originalName,
            mimeType: documentRecord.mimeType,
            fileSize: documentRecord.fileSize,
            fileHash: documentRecord.fileHash,
            documentType: documentRecord.documentType,
            processingStatus: documentRecord.processingStatus,
            ocrConfidence: null,
          },
          ocr: {
            rawText: '',
            languageDetected: req.body.languageHint || 'auto',
            confidence: null,
          },
          classification: {
            documentType: 'pdf',
            suggestedAction: 'ask_missing_data',
            confidence: 'low',
          },
          extracted: {},
          reviewState: reviewGate.reviewState,
          editablePayload: reviewGate.editablePayload,
          draftEligibility: reviewGate.draftEligibility,
          lifecycle: reviewGate.lifecycle,
          validation: {
            status: 'needs_review',
            errors: ['PDF OCR is not available in this local runtime.'],
            warnings: [
              'Upload a clear image of the document or enable PDF conversion/text extraction support.',
              'No invoice, expense, bank transaction, posting, approval, deletion, or reconciliation was created.',
            ],
            missingFields: ['readableDocumentImage'],
          },
          draft: null,
          audit: {
            advisoryOnly: true,
            requiresHumanConfirmation: true,
            blockedActions: ['post', 'approve', 'delete', 'reconcile'],
          },
        });
      }
      const languageMap = {
        de: 'deu',
        en: 'eng',
        ar: 'ara',
        auto: 'deu+eng',
      };
      const language = languageMap[req.body.languageHint || 'auto'] || 'deu+eng';

      const ocrResult = await ocrService.processDocument(req.file.path, {
        language,
        documentType,
        userId: req.userId,
        companyId: req.companyId,
        originalName: req.file.originalname,
        uploadedBy: req.userId,
      });

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || 'OCR processing failed');
      }

      let extractedData = ocrResult.extractedData || {};
      let effectiveType = documentType;
      if (requestedType === 'auto') {
        effectiveType = classifyDocumentType(ocrResult.text || '') || documentType;
        extractedData = await ocrService.extractStructuredData(ocrResult.text || '', effectiveType);
      }

      const intake = documentIntakeAssistantService.analyzeIntake({
        text: ocrResult.text || '',
        extractedData,
        documentType: requestedType === 'auto' ? 'auto' : effectiveType,
        documentId: ocrResult.documentId,
        userHint: req.body.userHint,
      });

      const documentRecord = await FileAttachment.findOne({
        where: { id: ocrResult.documentId, companyId: req.companyId },
      });

      if (documentRecord) {
        await documentRecord.update({
          processingStatus: intake.validation.status,
          documentType: intake.classification.documentType,
          extractedData: {
            ...extractedData,
            intake,
          },
        });
      }

      await AuditLogService.appendEntry({
        action: 'ocr_intake_analyze',
        resourceType: 'FileAttachment',
        resourceId: ocrResult.documentId ? String(ocrResult.documentId) : null,
        userId: req.userId,
        companyId: req.companyId,
        reason: 'AI document intake analyzed source document for advisory draft suggestion',
        newValues: {
          documentType: intake.classification.documentType,
          suggestedAction: intake.classification.suggestedAction,
          advisoryOnly: true,
          requiresHumanConfirmation: true,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || null,
      });

      return sendSuccess(res, 'Document intake analyzed', {
        requestId: req.requestId || null,
        document: documentRecord
          ? {
              id: documentRecord.id,
              originalName: documentRecord.originalName,
              mimeType: documentRecord.mimeType,
              fileSize: documentRecord.fileSize,
              fileHash: documentRecord.fileHash,
              documentType: documentRecord.documentType,
              processingStatus: documentRecord.processingStatus,
              ocrConfidence: documentRecord.ocrConfidence,
            }
          : {
              id: ocrResult.documentId,
              originalName: req.file.originalname,
              documentType: intake.classification.documentType,
              processingStatus: intake.validation.status,
              ocrConfidence: ocrResult.confidence,
            },
        ocr: {
          rawText: ocrResult.text || '',
          languageDetected: req.body.languageHint || 'auto',
          confidence: ocrResult.confidence ?? null,
        },
        classification: intake.classification,
        extracted: intake.extracted,
        reviewState: intake.reviewState,
        editablePayload: intake.editablePayload,
        draftEligibility: intake.draftEligibility,
        accountingDecision: intake.accountingDecision || intake.lifecycle?.accountingDecision || null,
        lifecycle: intake.lifecycle,
        validation: intake.validation,
        draft: intake.draft,
        audit: intake.audit,
        ...(await persistOcrApprovalQueueMetadata(buildOcrActionProposalMetadata({ req, documentRecord, intake }))),
      });
    } catch (error) {
      logger.error('OCR intake analysis failed', { error: error.message });
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return sendError(res, 'Unable to analyze document intake', 500);
    }
  },
);

router.get(
  '/intake/documents',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res) => {
    try {
      const {
        status,
        reviewStatus,
        draftCreated,
        manualOverride,
        accountantReviewRequired,
        limit = 50,
      } = req.query;

      const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
      const records = await FileAttachment.findAll({
        where: { companyId: req.companyId },
        order: [['createdAt', 'DESC']],
        limit: safeLimit,
      });

      let documents = records
        .map(buildDocumentInboxItem)
        .filter((item) => item.classification || item.reviewState || item.accountingDecision);

      if (status) {
        documents = documents.filter((item) => String(item.processingStatus || '') === String(status));
      }

      if (reviewStatus) {
        documents = documents.filter(
          (item) => String(item.reviewState?.status || '') === String(reviewStatus),
        );
      }

      if (draftCreated === 'true') {
        documents = documents.filter((item) => !!item.draftCreation?.draftId);
      } else if (draftCreated === 'false') {
        documents = documents.filter((item) => !item.draftCreation?.draftId);
      }

      if (manualOverride === 'true') {
        documents = documents.filter((item) => !!item.manualOverride);
      } else if (manualOverride === 'false') {
        documents = documents.filter((item) => !item.manualOverride);
      }

      if (accountantReviewRequired === 'true') {
        documents = documents.filter((item) => item.accountantReviewRequired === true);
      } else if (accountantReviewRequired === 'false') {
        documents = documents.filter((item) => item.accountantReviewRequired === false);
      }

      return sendSuccess(res, 'Document inbox retrieved', {
        count: documents.length,
        documents,
      });
    } catch (error) {
      logger.error('OCR document inbox failed', { error: error.message });
      return sendError(res, 'Unable to retrieve document inbox', 500);
    }
  },
);

router.post('/intake/:documentId/recheck', requireRole(['accountant']), async (req, res) => {
  const reviewedValues = req.body?.reviewedValues;
  const changeReason = String(req.body?.changeReason || '').trim();
  const manualOverride = req.body?.manualOverride;

  let validatedManualOverride = null;
  if (manualOverride !== null && manualOverride !== undefined) {
    const manualOverrideValidation = documentIntakeAssistantService.validateManualOverride(manualOverride);
    if (!manualOverrideValidation.valid) {
      return sendError(
        res,
        'Manual override is incomplete.',
        400,
        manualOverrideValidation.errors,
      );
    }
    validatedManualOverride = manualOverrideValidation.manualOverride;
  }

  if (!isNonEmptyPlainObject(reviewedValues)) {
    return sendError(res, 'reviewedValues must be a non-empty object.', 400);
  }

  try {
    const documentRecord = await FileAttachment.findOne({
      where: { id: req.params.documentId, companyId: req.companyId },
    });

    if (!documentRecord) {
      return sendError(res, 'Document not found.', 404);
    }

    const existingData = getJsonObject(documentRecord.extractedData);
    const existingIntake = getJsonObject(existingData.intake);
    const aiExtractedValues =
      existingIntake.editablePayload?.aiExtractedValues || existingIntake.extracted || {};
    const reviewedAt = new Date().toISOString();
    const fieldChanges = documentIntakeAssistantService.compareReviewedFields({
      aiExtractedValues,
      reviewedValues,
      userId: req.userId,
      timestamp: reviewedAt,
      reason: changeReason || null,
    });

    await AuditLogService.appendEntry({
      action: 'DOCUMENT_RECHECK_REQUESTED',
      resourceType: 'FileAttachment',
      resourceId: String(documentRecord.id),
      userId: req.userId,
      reason: changeReason || 'Document recheck requested',
      newValues: {
        companyId: req.companyId,
        documentId: documentRecord.id,
        reviewedFields: Object.keys(reviewedValues),
        fieldChanges,
        manualOverride: validatedManualOverride,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
    });

    const effectiveReviewedValues = validatedManualOverride
      ? documentIntakeAssistantService.buildRestrictedManualOverrideReviewedValues({
          reviewedValues,
          manualOverride: validatedManualOverride,
        })
      : reviewedValues;

    const extractedData = documentIntakeAssistantService.mapReviewedValuesToExtractedData(effectiveReviewedValues);
    const documentType = documentIntakeAssistantService.mapReviewedDocumentType(
      effectiveReviewedValues.documentType ||
        existingIntake.classification?.documentType ||
        documentRecord.documentType ||
        'auto',
    );
    const recheckedIntake = documentIntakeAssistantService.applyRecheckReviewGate({
      intake: documentIntakeAssistantService.analyzeIntake({
        text: documentRecord.ocrText || '',
        extractedData,
        documentType,
        documentId: documentRecord.id,
      }),
      aiExtractedValues,
      reviewedValues: effectiveReviewedValues,
      fieldChanges,
      userId: req.userId,
      reviewedAt,
    });

    if (validatedManualOverride) {
      recheckedIntake.editablePayload.manualOverride = validatedManualOverride;
      recheckedIntake.manualOverride = validatedManualOverride;
      recheckedIntake.lifecycle.editablePayload = {
        ...recheckedIntake.lifecycle.editablePayload,
        manualOverride: validatedManualOverride,
      };
      recheckedIntake.lifecycle.manualOverride = validatedManualOverride;
      recheckedIntake.draftEligibility = {
        ...recheckedIntake.draftEligibility,
        manualOverrideRequired: false,
        restrictedTaxTreatment: {
          taxTreatment: 'no_vorsteuer_allowed',
          inputVatAllowed: false,
          accountantReviewRequired: true,
        },
      };
      recheckedIntake.lifecycle.draftEligibility = recheckedIntake.draftEligibility;
    }

    await documentRecord.update({
      processingStatus: recheckedIntake.validation.status,
      documentType: recheckedIntake.classification.documentType,
      extractedData: {
        ...existingData,
        reviewedValues: effectiveReviewedValues,
        intake: recheckedIntake,
      },
    });

    await AuditLogService.appendEntry({
      action: 'DOCUMENT_RECHECK_COMPLETED',
      resourceType: 'FileAttachment',
      resourceId: String(documentRecord.id),
      userId: req.userId,
      reason: changeReason || 'Document recheck completed',
      newValues: {
        companyId: req.companyId,
        documentId: documentRecord.id,
        reviewState: recheckedIntake.reviewState,
        fieldChanges,
        validationStatus: recheckedIntake.validation.status,
        decisionFingerprint: recheckedIntake.decisionFingerprint,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
    });

    return sendSuccess(res, 'Document rechecked', buildIntakeResponse({
      req,
      documentRecord,
      intake: recheckedIntake,
    }));
  } catch (error) {
    logger.error('OCR intake recheck failed', { error: error.message });
    return sendError(res, 'Unable to recheck document intake', 500);
  }
});

router.post('/intake/:documentId/create-draft', requireRole(['accountant']), async (req, res) => {
  try {
    const result = await reviewedDocumentDraftService.createDraftFromReviewedDocument({
      documentId: req.params.documentId,
      companyId: req.companyId,
      userId: req.userId,
      reason: req.body?.reason || 'Create draft from reviewed document values',
      decisionFingerprint: req.body?.decisionFingerprint,
      requestId: req.requestId || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || null,
    });

    return sendSuccess(res, 'Draft created from reviewed values', result, 201);
  } catch (error) {
    logger.error('OCR intake draft creation failed', { error: error.message });
    const status = error.status || error.statusCode || 500;
    return sendError(
      res,
      status >= 500 ? 'Unable to create draft from reviewed document values' : error.message,
      status,
      error.details,
    );
  }
});

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

      const isPdfDocument =
        req.file.mimetype === 'application/pdf' ||
        String(req.file.originalname || '').toLowerCase().endsWith('.pdf');

      if (isPdfDocument) {
        const documentRecord = await FileAttachment.create({
          originalName: req.file.originalname,
          fileName: req.file.filename || req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          documentType: 'pdf',
          userId: req.userId,
          companyId: req.companyId,
          uploadedBy: req.userId,
          processingStatus: 'needs_review',
          extractedData: {
            intake: {
              classification: {
                documentType: 'pdf',
                suggestedAction: 'ask_missing_data',
                confidence: 'low',
              },
              extracted: {},
              validation: {
                status: 'needs_review',
                errors: ['PDF OCR is not available in this local runtime.'],
                warnings: [
                  'Upload a clear image of the document or enable PDF conversion/text extraction support.',
                  'No invoice, expense, bank transaction, posting, approval, deletion, or reconciliation was created.',
                ],
                missingFields: ['readableDocumentImage'],
              },
              draft: null,
              audit: {
                advisoryOnly: true,
                requiresHumanConfirmation: true,
                blockedActions: ['post', 'approve', 'delete', 'reconcile'],
              },
            },
          },
        });

        await AuditLogService.appendEntry({
          action: 'ocr_intake_analyze_pdf_unsupported',
          resourceType: 'FileAttachment',
          resourceId: String(documentRecord.id),
          userId: req.userId,
          companyId: req.companyId,
          reason: 'AI document intake received PDF but local PDF OCR conversion is not enabled',
          newValues: {
            documentType: 'pdf',
            suggestedAction: 'ask_missing_data',
            advisoryOnly: true,
            requiresHumanConfirmation: true,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
        });

        return sendSuccess(res, 'Document intake analyzed with review required', {
          requestId: req.requestId || null,
          document: {
            id: documentRecord.id,
            originalName: documentRecord.originalName,
            mimeType: documentRecord.mimeType,
            fileSize: documentRecord.fileSize,
            fileHash: documentRecord.fileHash,
            documentType: documentRecord.documentType,
            processingStatus: documentRecord.processingStatus,
            ocrConfidence: null,
          },
          ocr: {
            rawText: '',
            languageDetected: req.body.languageHint || 'auto',
            confidence: null,
          },
          classification: {
            documentType: 'pdf',
            suggestedAction: 'ask_missing_data',
            confidence: 'low',
          },
          extracted: {},
          validation: {
            status: 'needs_review',
            errors: ['PDF OCR is not available in this local runtime.'],
            warnings: [
              'Upload a clear image of the document or enable PDF conversion/text extraction support.',
              'No invoice, expense, bank transaction, posting, approval, deletion, or reconciliation was created.',
            ],
            missingFields: ['readableDocumentImage'],
          },
          draft: null,
          audit: {
            advisoryOnly: true,
            requiresHumanConfirmation: true,
            blockedActions: ['post', 'approve', 'delete', 'reconcile'],
          },
        });
      }

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
