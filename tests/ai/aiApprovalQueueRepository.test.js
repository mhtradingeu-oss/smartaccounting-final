const { AIApprovalQueueItem } = require('../../src/models');
const { buildAiActionProposal } = require('../../src/services/ai/aiActionProposalContract');
const { buildAiApprovalQueueItem } = require('../../src/services/ai/aiApprovalQueueContract');
const {
  listApprovalQueueItems,
  normalizeApprovalQueuePayload,
  persistApprovalQueueItem,
} = require('../../src/services/ai/aiApprovalQueueRepository');

const fixedNow = new Date('2026-07-04T12:00:00.000Z');

describe('AI Approval Queue Repository', () => {
  it('normalizes valid approval queue items for persistence', () => {
    const actionProposal = buildAiActionProposal({
      toolId: 'create_expense_draft_from_reviewed_document',
      preview: { vendorName: 'DB Vertrieb GmbH', grossAmount: 11.9 },
      reason: 'Reviewed values are complete.',
    });

    const item = buildAiApprovalQueueItem({
      actionProposal,
      requestedBy: 'ai_document_intake',
      requestedByUserId: 10,
      companyId: 99,
      createdAt: fixedNow,
    });

    const normalized = normalizeApprovalQueuePayload(item);

    expect(normalized).toMatchObject({
      valid: true,
      error: null,
      payload: {
        approvalId: item.id,
        companyId: 99,
        toolId: 'create_expense_draft_from_reviewed_document',
        status: 'pending',
        requiresApproval: true,
        blocked: false,
        auditRequired: true,
      },
    });
  });

  it('persists approval queue items idempotently by approvalId', async () => {
    const { user } = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    const actionProposal = buildAiActionProposal({
      toolId: 'create_expense_draft_from_reviewed_document',
      preview: { vendorName: 'DB Vertrieb GmbH', grossAmount: 11.9 },
      reason: 'Reviewed values are complete.',
    });

    const item = buildAiApprovalQueueItem({
      actionProposal,
      requestedBy: 'ai_document_intake',
      requestedByUserId: user.id,
      companyId: user.companyId,
      createdAt: fixedNow,
    });

    const first = await persistApprovalQueueItem({ item });
    const second = await persistApprovalQueueItem({ item });

    expect(first).toMatchObject({
      success: true,
      persisted: true,
      created: true,
      item: {
        approvalId: item.id,
        companyId: user.companyId,
        toolId: 'create_expense_draft_from_reviewed_document',
        status: 'pending',
        requiresApproval: true,
        blocked: false,
        auditRequired: true,
      },
    });

    expect(second).toMatchObject({
      success: true,
      persisted: true,
      created: false,
      item: {
        approvalId: item.id,
      },
    });

    const count = await AIApprovalQueueItem.count({ where: { approvalId: item.id } });
    expect(count).toBe(1);
  });

  it('lists persisted queue items only for the requested company', async () => {
    const first = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const second = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    const makeItem = ({ companyId, requestedByUserId, vendorName }) => {
      const actionProposal = buildAiActionProposal({
        toolId: 'create_expense_draft_from_reviewed_document',
        preview: { vendorName },
        reason: 'Reviewed values are complete.',
      });

      return buildAiApprovalQueueItem({
        actionProposal,
        requestedBy: 'ai_document_intake',
        requestedByUserId,
        companyId,
        createdAt: fixedNow,
      });
    };

    const visible = makeItem({
      companyId: first.user.companyId,
      requestedByUserId: first.user.id,
      vendorName: 'Visible GmbH',
    });

    const hidden = makeItem({
      companyId: second.user.companyId,
      requestedByUserId: second.user.id,
      vendorName: 'Hidden GmbH',
    });

    await persistApprovalQueueItem({ item: visible });
    await persistApprovalQueueItem({ item: hidden });

    const items = await listApprovalQueueItems({ companyId: first.user.companyId });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      approvalId: visible.id,
      companyId: first.user.companyId,
      requestedBy: 'ai_document_intake',
    });
  });

  it('rejects malformed queue items without persistence', async () => {
    const result = await persistApprovalQueueItem({
      item: {
        companyId: 1,
        toolId: 'create_expense_draft_from_reviewed_document',
      },
    });

    expect(result).toMatchObject({
      success: false,
      persisted: false,
      created: false,
      item: null,
      error: 'Approval queue item approvalId is required.',
    });
  });
});
