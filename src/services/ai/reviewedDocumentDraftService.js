const { FileAttachment } = require('../../models');
const AuditLogService = require('../auditLogService');
const documentIntakeAssistantService = require('./documentIntakeAssistantService');
const expenseService = require('../expenseService');
const invoiceService = require('../invoiceService');

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

const isValidUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const makeServiceError = (message, status = 500, details = undefined) => {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  if (details !== undefined) {
    err.details = details;
  }
  return err;
};

const createDraftFromReviewedDocument = async ({
  documentId,
  companyId,
  userId,
  reason = 'Create draft from reviewed document values',
  decisionFingerprint,
  requestId = null,
  ipAddress = null,
  userAgent = null,
} = {}) => {
  const cleanReason = String(reason || 'Create draft from reviewed document values').trim();
  const providedFingerprint = String(decisionFingerprint || '').trim();

  if (!isValidUuid(documentId)) {
    throw makeServiceError('Invalid document id.', 400);
  }

  const documentRecord = await FileAttachment.findOne({
    where: { id: documentId, companyId },
  });

  if (!documentRecord) {
    throw makeServiceError('Document not found.', 404);
  }

  const existingData = getJsonObject(documentRecord.extractedData);
  const intake = getJsonObject(existingData.intake);
  const reviewState = getJsonObject(intake.reviewState);
  const editablePayload = getJsonObject(intake.editablePayload);
  const reviewedValues = getJsonObject(editablePayload.reviewedValues);
  const storedManualOverride = getJsonObject(
    editablePayload.manualOverride || intake.manualOverride || intake.lifecycle?.manualOverride,
  );
  const hasManualOverride = isNonEmptyPlainObject(storedManualOverride);
  const currentFingerprint = intake.decisionFingerprint || intake.lifecycle?.decisionFingerprint || null;
  const accountingDecision = intake.accountingDecision || intake.lifecycle?.accountingDecision || null;

  if (reviewState.status !== 'rechecked' || reviewState.criticalFieldsReviewed !== true) {
    throw makeServiceError('Review extracted fields and re-check document before draft creation.', 409);
  }

  if (!isNonEmptyPlainObject(reviewedValues)) {
    throw makeServiceError('Reviewed values are required before draft creation.', 409);
  }

  if (!currentFingerprint || !providedFingerprint || providedFingerprint !== currentFingerprint) {
    throw makeServiceError('The reviewed document decision is stale. Re-check document first.', 409);
  }

  if (intake.validation?.status === 'needs_correction' || intake.validation?.errors?.length) {
    throw makeServiceError('Reviewed document still needs correction before draft creation.', 409);
  }

  if (Array.isArray(intake.validation?.missingFields) && intake.validation.missingFields.length > 0) {
    throw makeServiceError('Reviewed document needs additional information before draft creation.', 409);
  }

  const draftType = documentIntakeAssistantService.resolveReviewedDraftType({
    intake,
    reviewedValues,
  });

  if (!draftType) {
    throw makeServiceError('Unsupported reviewed document type for draft creation.', 422);
  }

  if (hasManualOverride && draftType !== 'expense') {
    throw makeServiceError('Manual override can only create an expense draft with restricted VAT treatment.', 422);
  }

  if (hasManualOverride) {
    const manualOverrideValidation =
      documentIntakeAssistantService.validateManualOverride(storedManualOverride);

    if (!manualOverrideValidation.valid) {
      throw makeServiceError(
        'Manual override with reason is required before draft creation.',
        409,
        manualOverrideValidation.errors,
      );
    }

    if (
      Number(reviewedValues.vatRate) !== 0 ||
      Number(reviewedValues.vatAmount) !== 0 ||
      reviewedValues.taxTreatment !== 'no_vorsteuer_allowed' ||
      reviewedValues.inputVatAllowed !== false ||
      reviewedValues.accountantReviewRequired !== true
    ) {
      throw makeServiceError(
        'Manual override draft requires restricted VAT treatment. Re-check document first.',
        409,
      );
    }
  }

  if (!intake.draftEligibility?.eligible) {
    throw makeServiceError('Reviewed document is not eligible for draft creation.', 422);
  }

  const systemContext = {
    source: 'ai_document_intake_reviewed',
    documentId: documentRecord.id,
    requestId,
    decisionFingerprint: currentFingerprint,
    accountingDecision,
    reviewState,
    fieldChanges: editablePayload.fieldChanges || [],
    manualOverride: hasManualOverride ? storedManualOverride : null,
    restrictedTaxTreatment: hasManualOverride
      ? {
          taxTreatment: 'no_vorsteuer_allowed',
          inputVatAllowed: false,
          accountantReviewRequired: true,
        }
      : null,
    reason: cleanReason,
  };

  let createdDraft;

  if (draftType === 'expense') {
    const payload = documentIntakeAssistantService.buildReviewedExpenseDraftPayload({
      reviewedValues,
      documentId: documentRecord.id,
      systemContext,
    });

    createdDraft = await expenseService.createExpense(payload, userId, companyId, {
      ipAddress,
      userAgent,
      userId,
      ...systemContext,
    });
  } else if (draftType === 'invoice') {
    const payload = documentIntakeAssistantService.buildReviewedInvoiceDraftPayload({
      reviewedValues,
      documentId: documentRecord.id,
      systemContext,
    });

    createdDraft = await invoiceService.createInvoice(payload, userId, companyId);
  }

  const updatedIntake = {
    ...intake,
    accountingDecision,
    lifecycle: {
      ...(intake.lifecycle || {}),
      ...(accountingDecision ? { accountingDecision } : {}),
    },
    draftCreation: {
      draftType,
      draftId: createdDraft?.id || null,
      createdAt: new Date().toISOString(),
      decisionFingerprint: currentFingerprint,
      accountingDecision,
    },
  };

  await documentRecord.reload();
  const latestData = getJsonObject(documentRecord.extractedData);

  await documentRecord.update({
    extractedData: {
      ...latestData,
      intake: updatedIntake,
    },
  });

  await AuditLogService.appendEntry({
    action: 'DOCUMENT_DRAFT_CREATED_FROM_REVIEWED_VALUES',
    resourceType: draftType === 'expense' ? 'Expense' : 'Invoice',
    resourceId: createdDraft?.id ? String(createdDraft.id) : null,
    userId,
    reason: cleanReason,
    newValues: {
      companyId,
      documentId: documentRecord.id,
      source: 'ai_document_intake_reviewed',
      draftType,
      draftId: createdDraft?.id || null,
      decisionFingerprint: currentFingerprint,
      accountingDecision,
      reviewState,
      fieldChanges: editablePayload.fieldChanges || [],
      manualOverride: hasManualOverride ? storedManualOverride : null,
      restrictedTaxTreatment: hasManualOverride
        ? {
            taxTreatment: 'no_vorsteuer_allowed',
            inputVatAllowed: false,
            accountantReviewRequired: true,
          }
        : null,
    },
    ipAddress,
    userAgent,
  });

  return {
    requestId,
    draft: {
      type: draftType,
      id: createdDraft?.id || null,
      status: createdDraft?.status || (draftType === 'invoice' ? 'DRAFT' : 'pending'),
      summary:
        draftType === 'expense'
          ? createdDraft?.vendorName || reviewedValues.vendorName || null
          : createdDraft?.clientName || reviewedValues.customerName || null,
    },
    intake: updatedIntake,
    reviewState: updatedIntake.reviewState,
    editablePayload: updatedIntake.editablePayload,
    draftEligibility: updatedIntake.draftEligibility,
    accountingDecision: updatedIntake.accountingDecision || updatedIntake.lifecycle?.accountingDecision || null,
    decisionFingerprint: currentFingerprint,
  };
};

module.exports = {
  createDraftFromReviewedDocument,
  getJsonObject,
  isNonEmptyPlainObject,
  isValidUuid,
};
