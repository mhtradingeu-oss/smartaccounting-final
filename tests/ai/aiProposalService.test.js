const {
  AI_PROPOSAL_SERVICE_RESULT_TYPES,
  createAiApprovalRequest,
  createAiProposal,
  createAiProposalBundle,
  isToolEligibleForProposalService,
  summarizeAiProposalBundle,
  AI_APPROVAL_STATUSES,
} = require('../../src/services/ai/aiProposalService');

const fixedNow = new Date('2026-07-04T12:00:00.000Z');

describe('AI Proposal Service', () => {
  it('creates proposal-only output for read-only tools', () => {
    const result = createAiProposalBundle({
      toolId: 'read_invoices',
      summary: 'Review open invoices.',
      preview: { invoiceCount: 3 },
      requestedByUserId: 10,
      companyId: 99,
      createdAt: fixedNow,
    });

    expect(result.success).toBe(true);
    expect(result.resultType).toBe(AI_PROPOSAL_SERVICE_RESULT_TYPES.PROPOSAL_ONLY);
    expect(result.proposal).toMatchObject({
      toolId: 'read_invoices',
      status: 'read_only',
      requiresApproval: false,
      blocked: false,
    });
    expect(result.approvalQueueItem).toBeNull();

    expect(summarizeAiProposalBundle(result)).toMatchObject({
      success: true,
      toolId: 'read_invoices',
      proposalStatus: 'read_only',
      approvalStatus: null,
      blocked: false,
    });
  });

  it('creates approval queue items for draft write proposals', () => {
    const result = createAiProposalBundle({
      toolId: 'create_expense_draft_from_reviewed_document',
      summary: 'Create an expense draft from reviewed document values.',
      preview: { vendorName: 'DB Vertrieb GmbH', grossAmount: 11.9 },
      reason: 'Reviewed values are complete.',
      requestedBy: 'ai_document_intake',
      requestedByUserId: 10,
      companyId: 99,
      createdAt: fixedNow,
    });

    expect(result.success).toBe(true);
    expect(result.resultType).toBe(AI_PROPOSAL_SERVICE_RESULT_TYPES.APPROVAL_REQUEST);
    expect(result.proposal).toMatchObject({
      toolId: 'create_expense_draft_from_reviewed_document',
      status: 'approval_required',
      requiresApproval: true,
      blocked: false,
    });
    expect(result.approvalQueueItem).toMatchObject({
      status: AI_APPROVAL_STATUSES.PENDING,
      toolId: 'create_expense_draft_from_reviewed_document',
      companyId: 99,
      requestedByUserId: 10,
      auditRequired: true,
    });

    expect(summarizeAiProposalBundle(result)).toMatchObject({
      success: true,
      resultType: AI_PROPOSAL_SERVICE_RESULT_TYPES.APPROVAL_REQUEST,
      toolId: 'create_expense_draft_from_reviewed_document',
      approvalStatus: AI_APPROVAL_STATUSES.PENDING,
      blocked: false,
    });
  });

  it('creates blocked proposal bundles for high-risk and forbidden tools without execution', () => {
    ['post_expense_to_ledger', 'submit_tax_or_elster', 'pay_or_move_money'].forEach((toolId) => {
      const result = createAiProposalBundle({
        toolId,
        companyId: 99,
        requestedByUserId: 10,
        createdAt: fixedNow,
      });

      expect(result.success).toBe(true);
      expect(result.resultType).toBe(AI_PROPOSAL_SERVICE_RESULT_TYPES.BLOCKED_PROPOSAL);
      expect(result.proposal.blocked).toBe(true);
      expect(result.approvalQueueItem).toMatchObject({
        status: AI_APPROVAL_STATUSES.EXECUTION_BLOCKED,
        blocked: true,
        auditRequired: true,
      });
      expect(summarizeAiProposalBundle(result)).toMatchObject({
        blocked: true,
        approvalStatus: AI_APPROVAL_STATUSES.EXECUTION_BLOCKED,
      });
    });
  });

  it('does not create approval requests for read-only proposals directly', () => {
    const proposalOnly = createAiProposal({
      toolId: 'read_invoices',
    });

    const approvalRequest = createAiApprovalRequest({
      actionProposal: proposalOnly.proposal,
      companyId: 99,
      requestedByUserId: 10,
      createdAt: fixedNow,
    });

    expect(approvalRequest.success).toBe(false);
    expect(approvalRequest.error).toBe(
      'Approval request can only be created for approval-required or blocked proposals.',
    );
    expect(approvalRequest.approvalQueueItem).toBeNull();
  });

  it('treats unknown tools as blocked proposal records', () => {
    const result = createAiProposalBundle({
      toolId: 'unknown_future_tool',
      companyId: 99,
      requestedByUserId: 10,
      createdAt: fixedNow,
    });

    expect(result.success).toBe(true);
    expect(result.resultType).toBe(AI_PROPOSAL_SERVICE_RESULT_TYPES.BLOCKED_PROPOSAL);
    expect(result.proposal).toMatchObject({
      toolKnown: false,
      riskLevel: 'forbidden',
      executionMode: 'blocked',
      blocked: true,
    });
    expect(result.approvalQueueItem.status).toBe(AI_APPROVAL_STATUSES.EXECUTION_BLOCKED);
  });

  it('reports proposal service eligibility without executing tools', () => {
    expect(isToolEligibleForProposalService('read_invoices')).toEqual({
      eligible: true,
      reason: 'Tool is eligible for proposal-only output.',
    });

    expect(isToolEligibleForProposalService('create_invoice_draft_from_reviewed_document')).toEqual({
      eligible: true,
      reason: 'Tool is eligible and requires approval.',
    });

    expect(isToolEligibleForProposalService('submit_tax_or_elster')).toEqual({
      eligible: true,
      reason: 'Tool is known but blocked; proposal service may only create a blocked proposal record.',
    });

    expect(isToolEligibleForProposalService('missing_tool')).toEqual({
      eligible: false,
      reason: 'Unknown tools are forbidden by default.',
    });
  });

  it('returns a safe summary for invalid bundles', () => {
    expect(summarizeAiProposalBundle(null)).toMatchObject({
      success: false,
      resultType: null,
      message: 'AI proposal bundle is required.',
    });
  });
});
