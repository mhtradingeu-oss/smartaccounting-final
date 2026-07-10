const { AIApprovalQueueItem } = require('../../src/models');
const {
  AI_APPROVAL_STATUSES,
  TERMINAL_APPROVAL_STATUSES,
} = require('../../src/services/ai/aiApprovalQueueContract');
const {
  markExecuted,
} = require('../../src/services/ai/aiApprovalQueueRepository');

const createApprovedItem = async ({
  approvalId,
  companyId,
  requestedByUserId,
  metadata = {},
} = {}) =>
  AIApprovalQueueItem.create({
    approvalId,
    schemaVersion: 'ai_approval_queue.v1',
    companyId,
    requestedByUserId,
    decidedByUserId: requestedByUserId,
    status: AI_APPROVAL_STATUSES.APPROVED,
    decision: 'approve',
    toolId: 'create_expense_draft_from_reviewed_document',
    riskLevel: 'draft_write',
    executionMode: 'prepare_draft',
    requiresApproval: true,
    blocked: false,
    requestedBy: 'ai_document_intake',
    approvalReason: 'Reviewed document is ready for draft preparation.',
    actionProposal: {
      type: 'action_proposal',
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
    },
    metadata,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    decidedAt: new Date(),
    auditRequired: true,
  });

describe('AI approval execution foundation', () => {
  it('declares executed as a terminal approval state', () => {
    expect(AI_APPROVAL_STATUSES.EXECUTED).toBe('executed');
    expect(TERMINAL_APPROVAL_STATUSES).toContain(
      AI_APPROVAL_STATUSES.EXECUTED,
    );
  });

  it('marks an approved item executed only inside its company scope', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_exec_foundation_${Date.now()}`;

    await createApprovedItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
      metadata: {
        documentId: '11111111-1111-4111-8111-111111111111',
        decisionFingerprint: 'fingerprint-test',
      },
    });

    const wrongCompanyResult = await markExecuted({
      approvalId,
      companyId: session.user.companyId + 9999,
      execution: {
        draftType: 'expense',
        draftId: 10,
      },
    });

    expect(wrongCompanyResult).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_NOT_FOUND',
    });

    const result = await markExecuted({
      approvalId,
      companyId: session.user.companyId,
      execution: {
        draftType: 'expense',
        draftId: 10,
        executedByUserId: session.user.id,
      },
    });

    expect(result).toMatchObject({
      success: true,
      item: {
        approvalId,
        companyId: session.user.companyId,
        status: 'executed',
        metadata: {
          execution: {
            draftType: 'expense',
            draftId: 10,
            executedByUserId: session.user.id,
          },
        },
      },
    });

    expect(result.item.metadata.execution.executedAt).toEqual(
      expect.any(String),
    );
  });

  it('rejects repeated execution', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_exec_duplicate_${Date.now()}`;

    await createApprovedItem({
      approvalId,
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
    });

    const first = await markExecuted({
      approvalId,
      companyId: session.user.companyId,
      execution: {
        draftType: 'expense',
        draftId: 20,
      },
    });

    expect(first.success).toBe(true);

    const second = await markExecuted({
      approvalId,
      companyId: session.user.companyId,
      execution: {
        draftType: 'expense',
        draftId: 21,
      },
    });

    expect(second).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_ALREADY_EXECUTED',
    });

    expect(second.item.metadata.execution.draftId).toBe(20);
  });

  it('rejects execution before approval', async () => {
    const session = await global.testUtils.createTestUserAndLogin({
      role: 'accountant',
    });

    const approvalId = `aiap_exec_pending_${Date.now()}`;

    await AIApprovalQueueItem.create({
      approvalId,
      schemaVersion: 'ai_approval_queue.v1',
      companyId: session.user.companyId,
      requestedByUserId: session.user.id,
      status: 'pending',
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
      requestedBy: 'ai_document_intake',
      approvalReason: 'Awaiting approval.',
      actionProposal: {
        type: 'action_proposal',
        toolId: 'create_expense_draft_from_reviewed_document',
        riskLevel: 'draft_write',
        executionMode: 'prepare_draft',
        requiresApproval: true,
        blocked: false,
      },
      metadata: {},
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      auditRequired: true,
    });

    const result = await markExecuted({
      approvalId,
      companyId: session.user.companyId,
      execution: {
        draftType: 'expense',
        draftId: 30,
      },
    });

    expect(result).toMatchObject({
      success: false,
      code: 'AI_APPROVAL_NOT_APPROVED',
    });
  });
});
