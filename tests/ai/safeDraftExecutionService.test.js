const {
  SAFE_DRAFT_TOOL_IDS,
  createSafeDraftExecutionService,
  validateApprovalExecutionContract,
} = require('../../src/services/ai/safeDraftExecutionService');

const buildApproval = ({
  toolId = 'create_expense_draft_from_reviewed_document',
  companyId = 10,
  status = 'approved',
  decision = 'approve',
  blocked = false,
  actionProposalBlocked = false,
  riskLevel = 'draft_write',
  executionMode = 'prepare_draft',
  requiresApproval = true,
  metadata = {},
} = {}) => ({
  approvalId: 'aiap_safe_executor_test',
  companyId,
  status,
  decision,
  blocked,
  toolId,
  riskLevel,
  executionMode,
  requiresApproval,
  actionProposal: {
    blocked: actionProposalBlocked,
  },
  metadata: {
    documentId: '11111111-1111-4111-8111-111111111111',
    decisionFingerprint: 'fingerprint-safe-executor',
    draftKind:
      toolId === 'create_invoice_draft_from_reviewed_document'
        ? 'invoice'
        : 'expense',
    ...metadata,
  },
});

const createHarness = ({
  approval = buildApproval(),
  draftResult = {
    draft: {
      type: 'expense',
      id: 501,
      status: 'pending',
      summary: 'Test Vendor',
    },
    decisionFingerprint: 'fingerprint-safe-executor',
  },
  claimResult = null,
  completionResult = null,
  draftError = null,
  releaseResult = null,
} = {}) => {
  const approvalRepository = {
    getByIdForCompany: jest.fn().mockResolvedValue(approval),

    claimExecution: jest.fn().mockResolvedValue(
      claimResult || {
        success: true,
        item: {
          ...approval,
          status: 'executing',
        },
        error: null,
        code: null,
      },
    ),

    recordPostDraftRecovery: jest.fn().mockResolvedValue({
      success: true,
      item: {
        ...approval,
        status: 'executing',
        metadata: {
          ...approval.metadata,
          postDraftRecovery: {
            state: 'completion_pending',
            draftType: draftResult?.draft?.type || null,
            draftId: draftResult?.draft?.id || null,
          },
        },
      },
      recovery: {
        state: 'completion_pending',
        draftType: draftResult?.draft?.type || null,
        draftId: draftResult?.draft?.id || null,
      },
      error: null,
      code: null,
    }),

    completeExecution: jest.fn().mockResolvedValue(
      completionResult || {
        success: true,
        item: {
          ...approval,
          status: 'executed',
          metadata: {
            ...approval.metadata,
            execution: {
              draftType: draftResult?.draft?.type || null,
              draftId: draftResult?.draft?.id || null,
            },
          },
        },
        error: null,
        code: null,
      },
    ),

    failExecution: jest.fn().mockResolvedValue(
      releaseResult || {
        success: true,
        item: {
          ...approval,
          status: 'approved',
        },
        error: null,
        code: null,
      },
    ),
  };

  const createDraftMock = draftError
    ? jest.fn().mockRejectedValue(draftError)
    : jest.fn().mockResolvedValue(draftResult);

  const draftService = {
    createDraftFromReviewedDocument: createDraftMock,
  };

  const eventPublisher = jest.fn().mockResolvedValue({
    success: true,
  });

  const service = createSafeDraftExecutionService({
    approvalRepository,
    draftService,
    eventPublisher,
  });

  return {
    service,
    approvalRepository,
    draftService,
    eventPublisher,
  };
};

describe('safeDraftExecutionService', () => {
  it('allows only the two reviewed-document draft tools', () => {
    expect(SAFE_DRAFT_TOOL_IDS).toEqual([
      'create_expense_draft_from_reviewed_document',
      'create_invoice_draft_from_reviewed_document',
    ]);
  });

  it('executes an approved expense draft through claim, draft, and completion', async () => {
    const approval = buildApproval();
    const harness = createHarness({ approval });

    const result =
      await harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
        reason: 'Execute reviewed expense draft',
        requestId: 'req-expense-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

    expect(
      harness.approvalRepository.getByIdForCompany,
    ).toHaveBeenCalledWith({
      approvalId: approval.approvalId,
      companyId: approval.companyId,
    });

    expect(
      harness.approvalRepository.claimExecution,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        claimedByUserId: 77,
      }),
    );

    expect(
      harness.draftService.createDraftFromReviewedDocument,
    ).toHaveBeenCalledWith({
      documentId:
        approval.metadata.documentId,
      companyId: approval.companyId,
      userId: 77,
      reason: 'Execute reviewed expense draft',
      decisionFingerprint:
        approval.metadata.decisionFingerprint,
      requestId: 'req-expense-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(
      harness.approvalRepository.recordPostDraftRecovery,
    ).toHaveBeenCalledWith({
      approvalId: approval.approvalId,
      companyId: approval.companyId,
      recovery: expect.objectContaining({
        toolId: approval.toolId,
        documentId: approval.metadata.documentId,
        decisionFingerprint:
          approval.metadata.decisionFingerprint,
        draftType: 'expense',
        draftId: 501,
        createdByUserId: 77,
        requestId: 'req-expense-1',
      }),
    });

    expect(
      harness.approvalRepository.completeExecution,
    ).toHaveBeenCalledWith({
      approvalId: approval.approvalId,
      companyId: approval.companyId,
      execution: expect.objectContaining({
        toolId: approval.toolId,
        documentId: approval.metadata.documentId,
        draftType: 'expense',
        draftId: 501,
        executedByUserId: 77,
      }),
    });

    expect(
      harness.approvalRepository.failExecution,
    ).not.toHaveBeenCalled();

    expect(harness.eventPublisher).toHaveBeenNthCalledWith(
      1,
      'execution.started',
      expect.objectContaining({
        approvalId: approval.approvalId,
        documentId: approval.metadata.documentId,
        entityId: approval.approvalId,
      }),
      expect.objectContaining({
        companyId: approval.companyId,
        userId: 77,
        correlationId: 'req-expense-1',
        source: 'safe_draft_execution',
      }),
    );

    expect(harness.eventPublisher).toHaveBeenNthCalledWith(
      2,
      'execution.completed',
      expect.objectContaining({
        approvalId: approval.approvalId,
        draftType: 'expense',
        draftId: 501,
      }),
      expect.objectContaining({
        correlationId: 'req-expense-1',
      }),
    );

    expect(result).toMatchObject({
      success: true,
      approvalId: approval.approvalId,
      companyId: approval.companyId,
      toolId:
        'create_expense_draft_from_reviewed_document',
      executionMode: 'prepare_draft',
      correlationId: 'req-expense-1',
      draft: {
        type: 'expense',
        id: 501,
        status: 'pending',
      },
    });
  });

  it('executes an approved invoice draft using the invoice tool contract', async () => {
    const approval = buildApproval({
      toolId:
        'create_invoice_draft_from_reviewed_document',
    });

    const harness = createHarness({
      approval,
      draftResult: {
        draft: {
          type: 'invoice',
          id: 601,
          status: 'DRAFT',
          summary: 'Test Customer',
        },
        decisionFingerprint:
          approval.metadata.decisionFingerprint,
      },
    });

    const result =
      await harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 88,
      });

    expect(result.draft).toMatchObject({
      type: 'invoice',
      id: 601,
      status: 'DRAFT',
    });

    expect(
      harness.approvalRepository.completeExecution,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        execution: expect.objectContaining({
          draftType: 'invoice',
          draftId: 601,
        }),
      }),
    );
  });

  it('rejects unknown or unsafe tools before claiming execution', async () => {
    const approval = buildApproval({
      toolId: 'submit_tax_or_elster',
      metadata: {
        draftKind: 'expense',
      },
    });

    const harness = createHarness({ approval });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toMatchObject({
      code: 'AI_APPROVAL_TOOL_NOT_ALLOWED',
      status: 403,
    });

    expect(
      harness.approvalRepository.claimExecution,
    ).not.toHaveBeenCalled();

    expect(
      harness.draftService.createDraftFromReviewedDocument,
    ).not.toHaveBeenCalled();
  });

  it('rejects missing execution references before claiming', async () => {
    const approval = buildApproval({
      metadata: {
        documentId: null,
      },
    });

    const harness = createHarness({ approval });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toMatchObject({
      code: 'AI_APPROVAL_DOCUMENT_ID_REQUIRED',
    });

    expect(
      harness.approvalRepository.claimExecution,
    ).not.toHaveBeenCalled();
  });

  it('rejects draftKind mismatches before claiming', async () => {
    const approval = buildApproval({
      metadata: {
        draftKind: 'invoice',
      },
    });

    const harness = createHarness({ approval });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toMatchObject({
      code: 'AI_APPROVAL_DRAFT_KIND_MISMATCH',
    });

    expect(
      harness.approvalRepository.claimExecution,
    ).not.toHaveBeenCalled();
  });

  it('does not call the draft service when the atomic claim fails', async () => {
    const approval = buildApproval();

    const harness = createHarness({
      approval,
      claimResult: {
        success: false,
        item: {
          ...approval,
          status: 'executing',
        },
        error:
          'Approval queue item execution is already in progress.',
        code: 'AI_APPROVAL_EXECUTION_IN_PROGRESS',
      },
    });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toMatchObject({
      code: 'AI_APPROVAL_EXECUTION_IN_PROGRESS',
      status: 409,
    });

    expect(
      harness.draftService.createDraftFromReviewedDocument,
    ).not.toHaveBeenCalled();

    expect(
      harness.approvalRepository.recordPostDraftRecovery,
    ).not.toHaveBeenCalled();

    expect(
      harness.approvalRepository.completeExecution,
    ).not.toHaveBeenCalled();
  });

  it('releases the claim when reviewed draft creation fails', async () => {
    const approval = buildApproval();

    const draftError = Object.assign(
      new Error('Reviewed document needs correction.'),
      {
        code: 'REVIEWED_DOCUMENT_NOT_READY',
        status: 409,
      },
    );

    const harness = createHarness({
      approval,
      draftError,
    });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toBe(draftError);

    expect(
      harness.approvalRepository.failExecution,
    ).toHaveBeenCalledWith({
      approvalId: approval.approvalId,
      companyId: approval.companyId,
      failure: {
        code: 'REVIEWED_DOCUMENT_NOT_READY',
        message: 'Reviewed document needs correction.',
        status: 409,
      },
    });

    expect(
      harness.approvalRepository.completeExecution,
    ).not.toHaveBeenCalled();
  });

  it('releases the claim when the draft result contract is invalid', async () => {
    const approval = buildApproval();

    const harness = createHarness({
      approval,
      draftResult: {
        draft: {
          type: 'invoice',
          id: 701,
          status: 'DRAFT',
        },
      },
    });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toMatchObject({
      code: 'AI_APPROVAL_INVALID_DRAFT_RESULT',
      status: 500,
    });

    expect(
      harness.approvalRepository.failExecution,
    ).toHaveBeenCalled();

    expect(
      harness.approvalRepository.completeExecution,
    ).not.toHaveBeenCalled();
  });

  it('keeps the execution claimed when recovery evidence persistence fails after draft creation', async () => {
    const approval = buildApproval();

    const harness = createHarness({ approval });

    harness.approvalRepository
      .recordPostDraftRecovery
      .mockResolvedValueOnce({
        success: false,
        item: {
          ...approval,
          status: 'executing',
        },
        error:
          'Recovery evidence persistence conflict.',
        code:
          'AI_APPROVAL_RECOVERY_EVIDENCE_CONFLICT',
      });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toMatchObject({
      code:
        'AI_APPROVAL_POST_DRAFT_RECOVERY_PERSIST_FAILED',
      status: 500,
      details: {
        draft: {
          type: 'expense',
          id: 501,
        },
      },
    });

    expect(
      harness.approvalRepository.failExecution,
    ).not.toHaveBeenCalled();

    expect(
      harness.approvalRepository.completeExecution,
    ).not.toHaveBeenCalled();
  });

  it('reports completion failure without releasing a claim after a draft exists', async () => {
    const approval = buildApproval();

    const harness = createHarness({
      approval,
      completionResult: {
        success: false,
        item: {
          ...approval,
          status: 'executing',
        },
        error:
          'Approval execution completion conflict.',
        code: 'AI_APPROVAL_EXECUTION_CONFLICT',
      },
    });

    await expect(
      harness.service.executeApprovedSafeDraft({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        userId: 77,
      }),
    ).rejects.toMatchObject({
      code:
        'AI_APPROVAL_COMPLETION_FAILED_AFTER_DRAFT_CREATION',
      status: 500,
      details: {
        draft: {
          type: 'expense',
          id: 501,
        },
      },
    });

    expect(
      harness.approvalRepository.recordPostDraftRecovery,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalId: approval.approvalId,
        companyId: approval.companyId,
        recovery: expect.objectContaining({
          draftType: 'expense',
          draftId: 501,
        }),
      }),
    );

    expect(
      harness.approvalRepository.failExecution,
    ).not.toHaveBeenCalled();
  });

  it('validates the approval contract independently', () => {
    expect(
      validateApprovalExecutionContract(buildApproval()),
    ).toMatchObject({
      documentId:
        '11111111-1111-4111-8111-111111111111',
      decisionFingerprint:
        'fingerprint-safe-executor',
      draftKind: 'expense',
    });
  });
});
