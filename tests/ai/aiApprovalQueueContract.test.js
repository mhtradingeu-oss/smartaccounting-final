const {
  AI_APPROVAL_DECISIONS,
  AI_APPROVAL_STATUSES,
  buildAiApprovalQueueItem,
  canDecideApprovalQueueItem,
  decideAiApprovalQueueItem,
  isApprovalExpired,
  validateAiApprovalQueueItem,
} = require('../../src/services/ai/aiApprovalQueueContract');
const { buildAiActionProposal } = require('../../src/services/ai/aiActionProposalContract');

const fixedNow = new Date('2026-07-04T12:00:00.000Z');

describe('AI Approval Queue Contract', () => {
  it('builds a pending approval item for approval-required draft proposals', () => {
    const actionProposal = buildAiActionProposal({
      toolId: 'create_expense_draft_from_reviewed_document',
      preview: { vendorName: 'DB Vertrieb GmbH', grossAmount: 11.9 },
      reason: 'Reviewed values are ready for draft creation.',
    });

    const item = buildAiApprovalQueueItem({
      actionProposal,
      requestedBy: 'ai_document_intake',
      requestedByUserId: 10,
      companyId: 99,
      createdAt: fixedNow,
    });

    expect(item).toMatchObject({
      schemaVersion: 'ai_approval_queue.v1',
      status: AI_APPROVAL_STATUSES.PENDING,
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
      requestedBy: 'ai_document_intake',
      requestedByUserId: 10,
      companyId: 99,
      auditRequired: true,
    });
    expect(item.id).toMatch(/^aiap_/);
    expect(item.expiresAt).toBe('2026-07-04T13:00:00.000Z');
    expect(validateAiApprovalQueueItem(item)).toEqual({ valid: true, errors: [] });
  });

  it('marks blocked action proposals as execution_blocked instead of pending', () => {
    const item = buildAiApprovalQueueItem({
      toolId: 'post_expense_to_ledger',
      companyId: 99,
      createdAt: fixedNow,
    });

    expect(item.status).toBe(AI_APPROVAL_STATUSES.EXECUTION_BLOCKED);
    expect(item.blocked).toBe(true);
    expect(canDecideApprovalQueueItem(item, fixedNow)).toMatchObject({
      allowed: false,
    });
    expect(validateAiApprovalQueueItem(item)).toEqual({ valid: true, errors: [] });
  });

  it('does not allow read-only proposals to enter an approval decision flow', () => {
    const item = buildAiApprovalQueueItem({
      toolId: 'read_invoices',
      companyId: 99,
      createdAt: fixedNow,
    });

    expect(item.status).toBe(AI_APPROVAL_STATUSES.PENDING);
    expect(item.requiresApproval).toBe(false);
    expect(canDecideApprovalQueueItem(item, fixedNow)).toEqual({
      allowed: false,
      reason: 'Approval is not required for this proposal.',
    });
  });

  it('approves pending approval items with a deciding user', () => {
    const item = buildAiApprovalQueueItem({
      toolId: 'create_invoice_draft_from_reviewed_document',
      companyId: 99,
      createdAt: fixedNow,
    });

    const result = decideAiApprovalQueueItem({
      item,
      decision: AI_APPROVAL_DECISIONS.APPROVE,
      decidedByUserId: 22,
      decisionReason: 'Reviewed document values look correct.',
      decidedAt: new Date('2026-07-04T12:10:00.000Z'),
      now: fixedNow,
    });

    expect(result.success).toBe(true);
    expect(result.item.status).toBe(AI_APPROVAL_STATUSES.APPROVED);
    expect(result.item.decidedByUserId).toBe(22);
    expect(result.item.decidedAt).toBe('2026-07-04T12:10:00.000Z');
    expect(validateAiApprovalQueueItem(result.item)).toEqual({ valid: true, errors: [] });
  });

  it('rejects pending approval items only with a decision reason', () => {
    const item = buildAiApprovalQueueItem({
      toolId: 'create_invoice_draft_from_reviewed_document',
      companyId: 99,
      createdAt: fixedNow,
    });

    expect(
      decideAiApprovalQueueItem({
        item,
        decision: AI_APPROVAL_DECISIONS.REJECT,
        decidedByUserId: 22,
        now: fixedNow,
      }),
    ).toMatchObject({
      success: false,
      error: 'Rejection requires a decision reason.',
    });

    const rejected = decideAiApprovalQueueItem({
      item,
      decision: AI_APPROVAL_DECISIONS.REJECT,
      decidedByUserId: 22,
      decisionReason: 'Vendor name is not verified.',
      now: fixedNow,
    });

    expect(rejected.success).toBe(true);
    expect(rejected.item.status).toBe(AI_APPROVAL_STATUSES.REJECTED);
    expect(validateAiApprovalQueueItem(rejected.item)).toEqual({ valid: true, errors: [] });
  });

  it('expires approval items after their TTL', () => {
    const item = buildAiApprovalQueueItem({
      toolId: 'create_invoice_draft_from_reviewed_document',
      companyId: 99,
      createdAt: fixedNow,
      ttlMinutes: 5,
    });

    const later = new Date('2026-07-04T12:06:00.000Z');
    expect(isApprovalExpired(item, later)).toBe(true);

    const expired = decideAiApprovalQueueItem({
      item,
      decision: AI_APPROVAL_DECISIONS.APPROVE,
      decidedByUserId: 22,
      now: later,
    });

    expect(expired.success).toBe(true);
    expect(expired.item.status).toBe(AI_APPROVAL_STATUSES.EXPIRED);
    expect(validateAiApprovalQueueItem(expired.item)).toEqual({ valid: true, errors: [] });
  });

  it('cancels and blocks approval items without execution', () => {
    const item = buildAiApprovalQueueItem({
      toolId: 'create_expense_draft_from_reviewed_document',
      companyId: 99,
      createdAt: fixedNow,
    });

    const cancelled = decideAiApprovalQueueItem({
      item,
      decision: AI_APPROVAL_DECISIONS.CANCEL,
      decidedByUserId: 22,
      decisionReason: 'User cancelled the request.',
      now: fixedNow,
    });
    expect(cancelled.success).toBe(true);
    expect(cancelled.item.status).toBe(AI_APPROVAL_STATUSES.CANCELLED);

    const blocked = decideAiApprovalQueueItem({
      item,
      decision: AI_APPROVAL_DECISIONS.BLOCK_EXECUTION,
      decidedByUserId: 22,
      decisionReason: 'Policy guard blocked execution.',
      now: fixedNow,
    });
    expect(blocked.success).toBe(true);
    expect(blocked.item.status).toBe(AI_APPROVAL_STATUSES.EXECUTION_BLOCKED);
    expect(blocked.item.blocked).toBe(true);
  });

  it('validates malformed approval queue items', () => {
    const result = validateAiApprovalQueueItem({
      schemaVersion: 'wrong',
      status: 'bad',
      auditRequired: false,
      createdAt: 'not-date',
      expiresAt: 'not-date',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Approval queue schemaVersion must be ai_approval_queue.v1.',
        'Approval queue item id is required.',
        'Approval queue status is invalid.',
        'Approval queue toolId is required.',
        'Approval queue actionProposal is required.',
        'Approval queue item must require audit.',
        'Approval queue createdAt must be a valid date.',
        'Approval queue expiresAt must be a valid date.',
      ]),
    );
  });

  it('forbids approving blocked proposals', () => {
    const item = buildAiApprovalQueueItem({
      toolId: 'submit_tax_or_elster',
      companyId: 99,
      createdAt: fixedNow,
    });

    const result = decideAiApprovalQueueItem({
      item,
      decision: AI_APPROVAL_DECISIONS.APPROVE,
      decidedByUserId: 22,
      now: fixedNow,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already execution_blocked/i);
  });
});
