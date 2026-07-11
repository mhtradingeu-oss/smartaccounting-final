const aiApprovalQueueRepository = require('./aiApprovalQueueRepository');
const reviewedDocumentDraftService = require('./reviewedDocumentDraftService');
const { getAiTool } = require('./aiToolRegistry');

const SAFE_DRAFT_TOOL_IDS = Object.freeze([
  'create_expense_draft_from_reviewed_document',
  'create_invoice_draft_from_reviewed_document',
]);

const EXPECTED_DRAFT_KIND_BY_TOOL = Object.freeze({
  create_expense_draft_from_reviewed_document: 'expense',
  create_invoice_draft_from_reviewed_document: 'invoice',
});

const makeExecutionError = (
  message,
  code,
  status = 409,
  details = null,
) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.statusCode = status;

  if (details !== null && details !== undefined) {
    error.details = details;
  }

  return error;
};

const normalizeRepositoryErrorStatus = (code) => {
  switch (code) {
    case 'AI_APPROVAL_ID_REQUIRED':
    case 'AI_APPROVAL_COMPANY_REQUIRED':
      return 400;

    case 'AI_APPROVAL_NOT_FOUND':
      return 404;

    case 'AI_APPROVAL_EXECUTION_BLOCKED':
      return 403;

    case 'AI_APPROVAL_ALREADY_EXECUTED':
    case 'AI_APPROVAL_EXECUTION_IN_PROGRESS':
    case 'AI_APPROVAL_NOT_APPROVED':
    case 'AI_APPROVAL_EXPIRED':
    case 'AI_APPROVAL_EXECUTION_NOT_CLAIMED':
    case 'AI_APPROVAL_EXECUTION_CONFLICT':
      return 409;

    default:
      return 500;
  }
};

const throwRepositoryResult = (result, fallbackMessage) => {
  throw makeExecutionError(
    result?.error || fallbackMessage,
    result?.code || 'AI_APPROVAL_EXECUTION_FAILED',
    normalizeRepositoryErrorStatus(result?.code),
    result?.item || null,
  );
};

const getPlainObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};

const validateApprovalExecutionContract = (approval) => {
  if (!approval) {
    throw makeExecutionError(
      'Approval queue item not found.',
      'AI_APPROVAL_NOT_FOUND',
      404,
    );
  }

  if (!SAFE_DRAFT_TOOL_IDS.includes(approval.toolId)) {
    throw makeExecutionError(
      'Approval tool is not allowed for safe draft execution.',
      'AI_APPROVAL_TOOL_NOT_ALLOWED',
      403,
      {
        toolId: approval.toolId || null,
      },
    );
  }

  const tool = getAiTool(approval.toolId);

  if (!tool) {
    throw makeExecutionError(
      'Approval tool is not registered.',
      'AI_APPROVAL_TOOL_NOT_REGISTERED',
      403,
      {
        toolId: approval.toolId,
      },
    );
  }

  if (
    tool.riskLevel !== 'draft_write' ||
    tool.executionMode !== 'prepare_draft' ||
    tool.approvalRequired !== true ||
    tool.finalPosting === true
  ) {
    throw makeExecutionError(
      'Approval tool does not satisfy the safe draft execution contract.',
      'AI_APPROVAL_TOOL_CONTRACT_INVALID',
      403,
      {
        toolId: approval.toolId,
        riskLevel: tool.riskLevel || null,
        executionMode: tool.executionMode || null,
        approvalRequired: tool.approvalRequired === true,
        finalPosting: tool.finalPosting === true,
      },
    );
  }

  if (
    approval.riskLevel !== 'draft_write' ||
    approval.executionMode !== 'prepare_draft' ||
    approval.requiresApproval !== true
  ) {
    throw makeExecutionError(
      'Approval item does not satisfy the safe draft execution contract.',
      'AI_APPROVAL_ITEM_CONTRACT_INVALID',
      409,
      {
        riskLevel: approval.riskLevel || null,
        executionMode: approval.executionMode || null,
        requiresApproval: approval.requiresApproval === true,
      },
    );
  }

  if (
    approval.blocked === true ||
    approval.actionProposal?.blocked === true
  ) {
    throw makeExecutionError(
      'Blocked approval queue items cannot be executed.',
      'AI_APPROVAL_EXECUTION_BLOCKED',
      403,
    );
  }

  const metadata = getPlainObject(approval.metadata);
  const documentId = metadata.documentId || null;
  const decisionFingerprint = metadata.decisionFingerprint || null;
  const draftKind = metadata.draftKind || null;
  const expectedDraftKind =
    EXPECTED_DRAFT_KIND_BY_TOOL[approval.toolId];

  if (!documentId) {
    throw makeExecutionError(
      'Approval metadata documentId is required.',
      'AI_APPROVAL_DOCUMENT_ID_REQUIRED',
      409,
    );
  }

  if (!decisionFingerprint) {
    throw makeExecutionError(
      'Approval metadata decisionFingerprint is required.',
      'AI_APPROVAL_DECISION_FINGERPRINT_REQUIRED',
      409,
    );
  }

  if (!draftKind) {
    throw makeExecutionError(
      'Approval metadata draftKind is required.',
      'AI_APPROVAL_DRAFT_KIND_REQUIRED',
      409,
    );
  }

  if (draftKind !== expectedDraftKind) {
    throw makeExecutionError(
      'Approval metadata draftKind does not match the approved tool.',
      'AI_APPROVAL_DRAFT_KIND_MISMATCH',
      409,
      {
        toolId: approval.toolId,
        draftKind,
        expectedDraftKind,
      },
    );
  }

  return {
    approval,
    tool,
    metadata,
    documentId,
    decisionFingerprint,
    draftKind,
  };
};

const createSafeDraftExecutionService = ({
  approvalRepository = aiApprovalQueueRepository,
  draftService = reviewedDocumentDraftService,
} = {}) => {
  const executeApprovedSafeDraft = async ({
    approvalId,
    companyId,
    userId,
    reason = 'Execute approved reviewed-document draft preparation',
    requestId = null,
    ipAddress = null,
    userAgent = null,
    now = new Date(),
  } = {}) => {
    if (!approvalId) {
      throw makeExecutionError(
        'approvalId is required.',
        'AI_APPROVAL_ID_REQUIRED',
        400,
      );
    }

    if (!companyId) {
      throw makeExecutionError(
        'companyId is required.',
        'AI_APPROVAL_COMPANY_REQUIRED',
        400,
      );
    }

    if (!userId) {
      throw makeExecutionError(
        'userId is required.',
        'AI_APPROVAL_EXECUTION_USER_REQUIRED',
        400,
      );
    }

    const approval = await approvalRepository.getByIdForCompany({
      approvalId,
      companyId,
    });

    const contract = validateApprovalExecutionContract(approval);

    const claimResult = await approvalRepository.claimExecution({
      approvalId,
      companyId,
      claimedByUserId: userId,
      now,
    });

    if (!claimResult?.success) {
      throwRepositoryResult(
        claimResult,
        'Approval queue item could not be claimed for execution.',
      );
    }

    let draftResult;

    try {
      draftResult =
        await draftService.createDraftFromReviewedDocument({
          documentId: contract.documentId,
          companyId,
          userId,
          reason,
          decisionFingerprint: contract.decisionFingerprint,
          requestId,
          ipAddress,
          userAgent,
        });
    } catch (error) {
      let releaseResult = null;

      try {
        releaseResult = await approvalRepository.failExecution({
          approvalId,
          companyId,
          failure: {
            code:
              error?.code ||
              'REVIEWED_DOCUMENT_DRAFT_CREATION_FAILED',
            message:
              error?.message ||
              'Reviewed document draft creation failed.',
            status:
              error?.statusCode ||
              error?.status ||
              500,
          },
        });
      } catch (releaseError) {
        throw makeExecutionError(
          'Draft creation failed and the execution claim could not be released.',
          'AI_APPROVAL_EXECUTION_RELEASE_FAILED',
          500,
          {
            originalError: {
              code: error?.code || null,
              message: error?.message || null,
            },
            releaseError: {
              code: releaseError?.code || null,
              message: releaseError?.message || null,
            },
          },
        );
      }

      if (!releaseResult?.success) {
        throw makeExecutionError(
          'Draft creation failed and the execution claim could not be released.',
          'AI_APPROVAL_EXECUTION_RELEASE_FAILED',
          500,
          {
            originalError: {
              code: error?.code || null,
              message: error?.message || null,
            },
            releaseResult,
          },
        );
      }

      throw error;
    }

    const draft = getPlainObject(draftResult?.draft);

    if (
      !draft.id ||
      !draft.type ||
      draft.type !== contract.draftKind
    ) {
      const invalidResultError = makeExecutionError(
        'Reviewed document draft service returned an invalid draft result.',
        'AI_APPROVAL_INVALID_DRAFT_RESULT',
        500,
        {
          expectedDraftKind: contract.draftKind,
          draft,
        },
      );

      const releaseResult = await approvalRepository.failExecution({
        approvalId,
        companyId,
        failure: {
          code: invalidResultError.code,
          message: invalidResultError.message,
          status: invalidResultError.status,
        },
      });

      if (!releaseResult?.success) {
        throw makeExecutionError(
          'Invalid draft result and the execution claim could not be released.',
          'AI_APPROVAL_EXECUTION_RELEASE_FAILED',
          500,
          {
            invalidResultError: {
              code: invalidResultError.code,
              message: invalidResultError.message,
            },
            releaseResult,
          },
        );
      }

      throw invalidResultError;
    }

    const completionResult =
      await approvalRepository.completeExecution({
        approvalId,
        companyId,
        execution: {
          toolId: approval.toolId,
          documentId: contract.documentId,
          decisionFingerprint:
            draftResult.decisionFingerprint ||
            contract.decisionFingerprint,
          draftType: draft.type,
          draftId: draft.id,
          draftStatus: draft.status || null,
          executedByUserId: userId,
          requestId,
        },
      });

    if (!completionResult?.success) {
      throw makeExecutionError(
        'Draft was created but approval execution completion failed.',
        'AI_APPROVAL_COMPLETION_FAILED_AFTER_DRAFT_CREATION',
        500,
        {
          approvalId,
          companyId,
          draft: {
            type: draft.type,
            id: draft.id,
            status: draft.status || null,
          },
          completionResult,
        },
      );
    }

    return {
      success: true,
      approvalId,
      companyId,
      toolId: approval.toolId,
      executionMode: 'prepare_draft',
      draft: {
        type: draft.type,
        id: draft.id,
        status: draft.status || null,
        summary: draft.summary || null,
      },
      decisionFingerprint:
        draftResult.decisionFingerprint ||
        contract.decisionFingerprint,
      approval: completionResult.item,
    };
  };

  return {
    executeApprovedSafeDraft,
  };
};

const defaultService = createSafeDraftExecutionService();

module.exports = {
  EXPECTED_DRAFT_KIND_BY_TOOL,
  SAFE_DRAFT_TOOL_IDS,
  createSafeDraftExecutionService,
  executeApprovedSafeDraft:
    defaultService.executeApprovedSafeDraft,
  makeExecutionError,
  validateApprovalExecutionContract,
};
