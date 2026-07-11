const { AIApprovalQueueItem } = require('../../src/models');
const {
  AI_APPROVAL_STATUSES,
} = require('../../src/services/ai/aiApprovalQueueContract');
const {
  recordPostDraftRecovery,
} = require('../../src/services/ai/aiApprovalQueueRepository');

const createExecutingApproval = async ({
  approvalId,
  companyId,
  userId,
  status = AI_APPROVAL_STATUSES.EXECUTING,
} = {}) =>
  AIApprovalQueueItem.create({
    approvalId,
    schemaVersion: 'ai_approval_queue.v1',
    companyId,
    requestedByUserId: userId,
    decidedByUserId: userId,
    status,
    decision: 'approve',
    toolId:
      'create_expense_draft_from_reviewed_document',
    riskLevel: 'draft_write',
    executionMode: 'prepare_draft',
    requiresApproval: true,
    blocked: false,
    requestedBy: 'ai_document_intake',
    approvalReason:
      'Create reviewed expense draft.',
    actionProposal: {
      type: 'action_proposal',
      toolId:
        'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
    },
    metadata: {
      documentId:
        '11111111-1111-4111-8111-111111111111',
      decisionFingerprint:
        'post-draft-recovery-fingerprint',
      draftKind: 'expense',
      executionClaim: {
        claimedByUserId: userId,
        claimedAt: new Date().toISOString(),
      },
    },
    expiresAt:
      new Date(Date.now() + 60 * 60 * 1000),
    decidedAt: new Date(),
    auditRequired: true,
  });

describe('AI approval post-draft recovery evidence', () => {
  it('stores recovery evidence only on an executing approval', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const approvalId =
      `aiap_recovery_${Date.now()}`;

    await createExecutingApproval({
      approvalId,
      companyId: session.user.companyId,
      userId: session.user.id,
    });

    const result = await recordPostDraftRecovery({
      approvalId,
      companyId: session.user.companyId,
      recovery: {
        toolId:
          'create_expense_draft_from_reviewed_document',
        documentId:
          '11111111-1111-4111-8111-111111111111',
        decisionFingerprint:
          'post-draft-recovery-fingerprint',
        draftType: 'expense',
        draftId: 501,
        draftStatus: 'pending',
        createdByUserId: session.user.id,
        requestId: 'req-recovery-1',
      },
    });

    expect(result).toMatchObject({
      success: true,
      item: {
        approvalId,
        status: 'executing',
        metadata: {
          postDraftRecovery: {
            state: 'completion_pending',
            draftType: 'expense',
            draftId: '501',
            draftStatus: 'pending',
            createdByUserId: session.user.id,
            requestId: 'req-recovery-1',
          },
        },
      },
    });

    expect(
      result.item.metadata.postDraftRecovery.recordedAt,
    ).toEqual(expect.any(String));
  });

  it('keeps company isolation for recovery evidence', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const approvalId =
      `aiap_recovery_company_${Date.now()}`;

    await createExecutingApproval({
      approvalId,
      companyId: session.user.companyId,
      userId: session.user.id,
    });

    const result = await recordPostDraftRecovery({
      approvalId,
      companyId: session.user.companyId + 9999,
      recovery: {
        documentId:
          '11111111-1111-4111-8111-111111111111',
        decisionFingerprint:
          'post-draft-recovery-fingerprint',
        draftType: 'expense',
        draftId: 502,
      },
    });

    expect(result).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_NOT_FOUND',
    });
  });

  it('rejects recovery persistence without an active execution claim', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const approvalId =
      `aiap_recovery_no_claim_${Date.now()}`;

    await createExecutingApproval({
      approvalId,
      companyId: session.user.companyId,
      userId: session.user.id,
      status: AI_APPROVAL_STATUSES.APPROVED,
    });

    const result = await recordPostDraftRecovery({
      approvalId,
      companyId: session.user.companyId,
      recovery: {
        documentId:
          '11111111-1111-4111-8111-111111111111',
        decisionFingerprint:
          'post-draft-recovery-fingerprint',
        draftType: 'expense',
        draftId: 503,
      },
    });

    expect(result).toMatchObject({
      success: false,
      code:
        'AI_APPROVAL_EXECUTION_NOT_CLAIMED',
    });
  });

  it('rejects recovery evidence that does not match the approval origin', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const createCase = async (suffix) => {
      const approvalId =
        `aiap_recovery_integrity_${suffix}_${Date.now()}_${Math.random()}`;

      await createExecutingApproval({
        approvalId,
        companyId: session.user.companyId,
        userId: session.user.id,
      });

      return approvalId;
    };

    const baseRecovery = {
      toolId:
        'create_expense_draft_from_reviewed_document',
      documentId:
        '11111111-1111-4111-8111-111111111111',
      decisionFingerprint:
        'post-draft-recovery-fingerprint',
      draftType: 'expense',
      draftId: 601,
      createdByUserId: session.user.id,
    };

    const toolId = await createCase('tool');

    await expect(
      recordPostDraftRecovery({
        approvalId: toolId,
        companyId: session.user.companyId,
        recovery: {
          ...baseRecovery,
          toolId:
            'create_invoice_draft_from_reviewed_document',
        },
      }),
    ).resolves.toMatchObject({
      success: false,
      code: 'AI_APPROVAL_RECOVERY_TOOL_MISMATCH',
    });

    const documentId = await createCase('document');

    await expect(
      recordPostDraftRecovery({
        approvalId: documentId,
        companyId: session.user.companyId,
        recovery: {
          ...baseRecovery,
          documentId:
            '22222222-2222-4222-8222-222222222222',
        },
      }),
    ).resolves.toMatchObject({
      success: false,
      code:
        'AI_APPROVAL_RECOVERY_DOCUMENT_MISMATCH',
    });

    const fingerprint = await createCase('fingerprint');

    await expect(
      recordPostDraftRecovery({
        approvalId: fingerprint,
        companyId: session.user.companyId,
        recovery: {
          ...baseRecovery,
          decisionFingerprint:
            'different-fingerprint',
        },
      }),
    ).resolves.toMatchObject({
      success: false,
      code:
        'AI_APPROVAL_RECOVERY_FINGERPRINT_MISMATCH',
    });

    const draftKind = await createCase('draft-kind');

    await expect(
      recordPostDraftRecovery({
        approvalId: draftKind,
        companyId: session.user.companyId,
        recovery: {
          ...baseRecovery,
          draftType: 'invoice',
        },
      }),
    ).resolves.toMatchObject({
      success: false,
      code:
        'AI_APPROVAL_RECOVERY_DRAFT_KIND_MISMATCH',
    });
  });

  it('treats an identical recovery retry as idempotent without replacing recordedAt', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const approvalId =
      `aiap_recovery_idempotent_${Date.now()}`;

    await createExecutingApproval({
      approvalId,
      companyId: session.user.companyId,
      userId: session.user.id,
    });

    const recovery = {
      toolId:
        'create_expense_draft_from_reviewed_document',
      documentId:
        '11111111-1111-4111-8111-111111111111',
      decisionFingerprint:
        'post-draft-recovery-fingerprint',
      draftType: 'expense',
      draftId: 701,
      draftStatus: 'pending',
      createdByUserId: session.user.id,
      requestId: 'req-idempotent',
    };

    const first = await recordPostDraftRecovery({
      approvalId,
      companyId: session.user.companyId,
      recovery,
    });

    const second = await recordPostDraftRecovery({
      approvalId,
      companyId: session.user.companyId,
      recovery,
    });

    expect(first).toMatchObject({
      success: true,
      idempotent: false,
      recovery: {
        draftId: '701',
      },
    });

    expect(second).toMatchObject({
      success: true,
      idempotent: true,
      recovery: {
        draftId: '701',
      },
    });

    expect(second.recovery.recordedAt).toBe(
      first.recovery.recordedAt,
    );
  });

  it('does not allow different evidence to overwrite the original recovery record', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const approvalId =
      `aiap_recovery_immutable_${Date.now()}`;

    await createExecutingApproval({
      approvalId,
      companyId: session.user.companyId,
      userId: session.user.id,
    });

    const first = await recordPostDraftRecovery({
      approvalId,
      companyId: session.user.companyId,
      recovery: {
        toolId:
          'create_expense_draft_from_reviewed_document',
        documentId:
          '11111111-1111-4111-8111-111111111111',
        decisionFingerprint:
          'post-draft-recovery-fingerprint',
        draftType: 'expense',
        draftId: 801,
        draftStatus: 'pending',
        createdByUserId: session.user.id,
        requestId: 'req-original',
      },
    });

    const conflicting =
      await recordPostDraftRecovery({
        approvalId,
        companyId: session.user.companyId,
        recovery: {
          toolId:
            'create_expense_draft_from_reviewed_document',
          documentId:
            '11111111-1111-4111-8111-111111111111',
          decisionFingerprint:
            'post-draft-recovery-fingerprint',
          draftType: 'expense',
          draftId: 999,
          draftStatus: 'pending',
          createdByUserId: session.user.id,
          requestId: 'req-conflict',
        },
      });

    expect(first.success).toBe(true);

    expect(conflicting).toMatchObject({
      success: false,
      code:
        'AI_APPROVAL_RECOVERY_EVIDENCE_CONFLICT',
      recovery: {
        draftId: '801',
        requestId: 'req-original',
      },
    });

    const record =
      await AIApprovalQueueItem.findOne({
        where: {
          approvalId,
          companyId: session.user.companyId,
        },
      });

    expect(
      record.metadata.postDraftRecovery,
    ).toMatchObject({
      draftId: '801',
      requestId: 'req-original',
    });
  });

  it('allows only one of two concurrent different recovery records to become canonical', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const approvalId =
      `aiap_recovery_concurrent_${Date.now()}`;

    await createExecutingApproval({
      approvalId,
      companyId: session.user.companyId,
      userId: session.user.id,
    });

    const common = {
      toolId:
        'create_expense_draft_from_reviewed_document',
      documentId:
        '11111111-1111-4111-8111-111111111111',
      decisionFingerprint:
        'post-draft-recovery-fingerprint',
      draftType: 'expense',
      draftStatus: 'pending',
      createdByUserId: session.user.id,
    };

    const results = await Promise.all([
      recordPostDraftRecovery({
        approvalId,
        companyId: session.user.companyId,
        recovery: {
          ...common,
          draftId: 901,
          requestId: 'req-concurrent-a',
        },
      }),
      recordPostDraftRecovery({
        approvalId,
        companyId: session.user.companyId,
        recovery: {
          ...common,
          draftId: 902,
          requestId: 'req-concurrent-b',
        },
      }),
    ]);

    const successes = results.filter(
      (result) => result.success === true,
    );

    const conflicts = results.filter(
      (result) =>
        result.success === false &&
        result.code ===
          'AI_APPROVAL_RECOVERY_EVIDENCE_CONFLICT',
    );

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);

    const stored =
      await AIApprovalQueueItem.findOne({
        where: {
          approvalId,
          companyId: session.user.companyId,
        },
      });

    expect(['901', '902']).toContain(
      String(
        stored.metadata.postDraftRecovery.draftId,
      ),
    );
  });

  it('rejects incomplete or unsupported recovery evidence', async () => {
    const session =
      await global.testUtils.createTestUserAndLogin({
        role: 'accountant',
      });

    const approvalId =
      `aiap_recovery_invalid_${Date.now()}`;

    await createExecutingApproval({
      approvalId,
      companyId: session.user.companyId,
      userId: session.user.id,
    });

    const missingDraftId =
      await recordPostDraftRecovery({
        approvalId,
        companyId: session.user.companyId,
        recovery: {
          documentId:
            '11111111-1111-4111-8111-111111111111',
          decisionFingerprint:
            'post-draft-recovery-fingerprint',
          draftType: 'expense',
        },
      });

    expect(missingDraftId).toMatchObject({
      success: false,
      code:
        'AI_APPROVAL_RECOVERY_EVIDENCE_INVALID',
    });

    const invalidType =
      await recordPostDraftRecovery({
        approvalId,
        companyId: session.user.companyId,
        recovery: {
          documentId:
            '11111111-1111-4111-8111-111111111111',
          decisionFingerprint:
            'post-draft-recovery-fingerprint',
          draftType: 'ledger',
          draftId: 504,
        },
      });

    expect(invalidType).toMatchObject({
      success: false,
      code:
        'AI_APPROVAL_RECOVERY_DRAFT_TYPE_INVALID',
    });
  });
});
