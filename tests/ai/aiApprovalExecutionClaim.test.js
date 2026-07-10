const { AIApprovalQueueItem } = require('../../src/models');
const {
  AI_APPROVAL_STATUSES,
  TERMINAL_APPROVAL_STATUSES,
} = require('../../src/services/ai/aiApprovalQueueContract');
const {
  claimExecution,
  completeExecution,
  failExecution,
  getByIdForCompany,
} = require('../../src/services/ai/aiApprovalQueueRepository');

const createApprovalItem = async ({
  approvalId,
  companyId,
  requestedByUserId,
  status = AI_APPROVAL_STATUSES.APPROVED,
  decision = 'approve',
  blocked = false,
  actionProposalBlocked = blocked,
  expiresAt = new Date(Date.now() + 60 * 60 * 1000),
} = {}) =>
  AIApprovalQueueItem.create({
    approvalId,
    schemaVersion: 'ai_approval_queue.v1',
    companyId,
    requestedByUserId,
    decidedByUserId:
      status === AI_APPROVAL_STATUSES.PENDING
        ? null
        : requestedByUserId,
    status,
    decision:
      status === AI_APPROVAL_STATUSES.PENDING
        ? null
        : decision,
    toolId: 'create_expense_draft_from_reviewed_document',
    riskLevel: 'draft_write',
    executionMode: 'prepare_draft',
    requiresApproval: true,
    blocked,
    requestedBy: 'ai_document_intake',
    approvalReason: 'Prepare a reviewed expense draft.',
    actionProposal: {
      type: 'action_proposal',
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: actionProposalBlocked,
    },
    metadata: {
      documentId: '11111111-1111-4111-8111-111111111111',
      decisionFingerprint: 'claim-fingerprint',
      draftKind: 'expense',
    },
    expiresAt,
    decidedAt:
      status === AI_APPROVAL_STATUSES.PENDING
        ? null
        : new Date(),
    auditRequired: true,
  });

describe('AI approval atomic execution claim foundation', () => {
  it('declares executing as a non-terminal approval state', () => {
    expect(AI_APPROVAL_STATUSES.EXECUTING).toBe('executing');
    expect(TERMINAL_APPROVAL_STATUSES).not.toContain(
      AI_APPROVAL_STATUSES.EXECUTING,
    );
  });

  it('loads an approval item only inside the requested company scope', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_company_load_${Date.now()}`;

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
    });

    const correctCompany = await getByIdForCompany({
      approvalId,
      companyId: session.user.companyId,
    });

    const wrongCompany = await getByIdForCompany({
      approvalId,
      companyId: session.user.companyId + 9999,
    });

    expect(correctCompany).toMatchObject({
      approvalId,
      companyId: session.user.companyId,
    });

    expect(wrongCompany).toBeNull();
  });

  it('allows only one concurrent execution claim', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_atomic_claim_${Date.now()}`;

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
    });

    const results = await Promise.all([
      claimExecution({
        approvalId,
        companyId: session.user.companyId,
        claimedByUserId: session.user.id,
      }),
      claimExecution({
        approvalId,
        companyId: session.user.companyId,
        claimedByUserId: session.user.id,
      }),
    ]);

    const successes = results.filter((result) => result.success === true);
    const failures = results.filter((result) => result.success === false);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    expect(successes[0]).toMatchObject({
      success: true,
      item: {
        approvalId,
        status: 'executing',
        metadata: {
          executionClaim: {
            claimedByUserId: session.user.id,
          },
        },
      },
    });

    expect(
      successes[0].item.metadata.executionClaim.claimedAt,
    ).toEqual(expect.any(String));

    expect(failures[0]).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_EXECUTION_IN_PROGRESS',
    });

    const record = await AIApprovalQueueItem.findOne({
      where: {
        approvalId,
        companyId: session.user.companyId,
      },
    });

    expect(record.status).toBe('executing');
  });

  it('blocks wrong-company and unapproved claims', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvedId = `aiap_wrong_company_${Date.now()}`;
    const pendingId = `aiap_pending_claim_${Date.now()}`;

    await createApprovalItem({
      approvalId: approvedId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
    });

    await createApprovalItem({
      approvalId: pendingId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
      status: AI_APPROVAL_STATUSES.PENDING,
      decision: null,
    });

    const wrongCompany = await claimExecution({
      approvalId: approvedId,
      companyId: session.user.companyId + 9999,
      claimedByUserId: session.user.id,
    });

    const pending = await claimExecution({
      approvalId: pendingId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
    });

    expect(wrongCompany).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_NOT_FOUND',
    });

    expect(pending).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_NOT_APPROVED',
    });
  });

  it('blocks a claim when the action proposal payload is blocked', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_payload_blocked_${Date.now()}`;

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
      blocked: false,
      actionProposalBlocked: true,
    });

    const result = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
    });

    expect(result).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_EXECUTION_BLOCKED',
      item: {
        approvalId,
        status: 'approved',
      },
    });

    const record = await AIApprovalQueueItem.findOne({
      where: {
        approvalId,
        companyId: session.user.companyId,
      },
    });

    expect(record.status).toBe('approved');
    expect(record.metadata.executionClaim).toBeUndefined();
  });

  it('blocks an expired approved item from being claimed', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_expired_claim_${Date.now()}`;
    const now = new Date('2026-07-10T22:30:00.000Z');

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
      expiresAt: new Date('2026-07-10T22:29:59.000Z'),
    });

    const result = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
      now,
    });

    expect(result).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_EXPIRED',
      item: {
        approvalId,
        status: 'approved',
      },
    });

    const record = await AIApprovalQueueItem.findOne({
      where: {
        approvalId,
        companyId: session.user.companyId,
      },
    });

    expect(record.status).toBe('approved');
    expect(record.metadata.executionClaim).toBeUndefined();
  });

  it('enforces expiry inside the atomic claim update', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_atomic_expiry_${Date.now()}`;
    const now = new Date('2026-07-10T22:40:00.000Z');

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
      expiresAt: new Date('2026-07-10T22:40:01.000Z'),
    });

    const originalUpdate = AIApprovalQueueItem.update.bind(
      AIApprovalQueueItem,
    );

    const updateSpy = jest
      .spyOn(AIApprovalQueueItem, 'update')
      .mockImplementationOnce(async (values, options) => {
        await AIApprovalQueueItem.update(
          {
            expiresAt: new Date('2026-07-10T22:39:59.000Z'),
          },
          {
            where: {
              approvalId,
              companyId: session.user.companyId,
            },
          },
        );

        return originalUpdate(values, options);
      });

    const result = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
      now,
    });

    updateSpy.mockRestore();

    expect(result).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_EXPIRED',
      item: {
        approvalId,
        status: 'approved',
      },
    });

    const record = await AIApprovalQueueItem.findOne({
      where: {
        approvalId,
        companyId: session.user.companyId,
      },
    });

    expect(record.status).toBe('approved');
    expect(record.metadata.executionClaim).toBeUndefined();
  });

  it('reports execution in progress before considering later expiry', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_state_priority_${Date.now()}`;
    const initialNow = new Date('2026-07-10T22:50:00.000Z');

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
      expiresAt: new Date('2026-07-10T22:50:01.000Z'),
    });

    const firstClaim = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
      now: initialNow,
    });

    expect(firstClaim.success).toBe(true);

    const secondClaim = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
      now: new Date('2026-07-10T22:51:00.000Z'),
    });

    expect(secondClaim).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_EXECUTION_IN_PROGRESS',
      item: {
        approvalId,
        status: 'executing',
      },
    });
  });

  it('completes an active execution claim exactly once', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_complete_claim_${Date.now()}`;

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
    });

    const claim = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
    });

    expect(claim.success).toBe(true);

    const completion = await completeExecution({
      approvalId,
      companyId: session.user.companyId,
      execution: {
        draftType: 'expense',
        draftId: 501,
        documentId: '11111111-1111-4111-8111-111111111111',
        executedByUserId: session.user.id,
      },
    });

    expect(completion).toMatchObject({
      success: true,
      item: {
        approvalId,
        status: 'executed',
        metadata: {
          execution: {
            draftType: 'expense',
            draftId: 501,
            executedByUserId: session.user.id,
          },
        },
      },
    });

    expect(completion.item.metadata.execution.executedAt).toEqual(
      expect.any(String),
    );

    const secondCompletion = await completeExecution({
      approvalId,
      companyId: session.user.companyId,
      execution: {
        draftType: 'expense',
        draftId: 502,
      },
    });

    expect(secondCompletion).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_ALREADY_EXECUTED',
    });

    expect(secondCompletion.item.metadata.execution.draftId).toBe(501);
  });

  it('releases a failed execution claim back to approved for retry', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_failed_claim_${Date.now()}`;

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
    });

    const firstClaim = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
    });

    expect(firstClaim.success).toBe(true);

    const failure = await failExecution({
      approvalId,
      companyId: session.user.companyId,
      failure: {
        code: 'REVIEWED_DOCUMENT_NOT_READY',
        message: 'Reviewed document needs correction.',
      },
    });

    expect(failure).toMatchObject({
      success: true,
      item: {
        approvalId,
        status: 'approved',
        metadata: {
          lastExecutionFailure: {
            code: 'REVIEWED_DOCUMENT_NOT_READY',
          },
        },
      },
    });

    expect(failure.item.metadata.lastExecutionFailure.failedAt).toEqual(
      expect.any(String),
    );

    const retryClaim = await claimExecution({
      approvalId,
      companyId: session.user.companyId,
      claimedByUserId: session.user.id,
    });

    expect(retryClaim).toMatchObject({
      success: true,
      item: {
        status: 'executing',
      },
    });
  });

  it('rejects completion or failure release without an active claim', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_no_claim_${Date.now()}`;

    await createApprovalItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
    });

    const completion = await completeExecution({
      approvalId,
      companyId: session.user.companyId,
      execution: {
        draftType: 'expense',
        draftId: 601,
      },
    });

    const failure = await failExecution({
      approvalId,
      companyId: session.user.companyId,
      failure: {
        code: 'UNEXPECTED',
      },
    });

    expect(completion).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_EXECUTION_NOT_CLAIMED',
    });

    expect(failure).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_EXECUTION_NOT_CLAIMED',
    });
  });
});
