const {
  ACTION_PROPOSAL_STATUSES,
  ACTION_PROPOSAL_TYPE,
  APPROVAL_REQUIRED_TEXT,
  DEFAULT_BLOCKED_ACTIONS,
  buildAiActionProposal,
  validateAiActionProposal,
} = require('../../src/services/ai/aiActionProposalContract');

describe('AI Action Proposal Contract', () => {
  it('builds a read-only action proposal without approval', () => {
    const proposal = buildAiActionProposal({
      toolId: 'read_invoices',
      summary: 'Review open invoices.',
      preview: { invoiceCount: 3 },
      evidence: [{ source: 'Invoice', count: 3 }],
    });

    expect(proposal).toMatchObject({
      type: ACTION_PROPOSAL_TYPE,
      schemaVersion: 'ai_action_proposal.v1',
      toolId: 'read_invoices',
      toolKnown: true,
      riskLevel: 'read_only',
      executionMode: 'read',
      status: ACTION_PROPOSAL_STATUSES.READ_ONLY,
      requiresApproval: false,
      blocked: false,
      readOnlyText: expect.stringMatching(/read-only/i),
      preview: { invoiceCount: 3 },
    });
    expect(validateAiActionProposal(proposal)).toEqual({ valid: true, errors: [] });
  });

  it('builds approval-required proposals for draft write tools', () => {
    const proposal = buildAiActionProposal({
      toolId: 'create_expense_draft_from_reviewed_document',
      summary: 'Create an expense draft from reviewed document values.',
      preview: { vendorName: 'DB Vertrieb GmbH', grossAmount: 11.9 },
      reason: 'Reviewed receipt fields are complete.',
      requestedBy: 'ai_document_intake',
    });

    expect(proposal).toMatchObject({
      type: ACTION_PROPOSAL_TYPE,
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      status: ACTION_PROPOSAL_STATUSES.APPROVAL_REQUIRED,
      requiresApproval: true,
      approvalRequiredText: APPROVAL_REQUIRED_TEXT,
      blocked: false,
      finalPosting: false,
      directExternalSubmission: false,
    });
    expect(proposal.allowedRoles).toEqual(['admin', 'accountant']);
    expect(validateAiActionProposal(proposal)).toEqual({ valid: true, errors: [] });
  });

  it('blocks high-risk accounting execution proposals in Phase 6F', () => {
    const proposal = buildAiActionProposal({
      toolId: 'post_expense_to_ledger',
      summary: 'Post expense to ledger.',
    });

    expect(proposal).toMatchObject({
      toolId: 'post_expense_to_ledger',
      riskLevel: 'high_risk',
      executionMode: 'blocked',
      status: ACTION_PROPOSAL_STATUSES.BLOCKED,
      requiresApproval: true,
      blocked: true,
      blockedReason: expect.stringMatching(/Final accounting posting/i),
      blockedActionText: expect.stringMatching(/blocked for direct AI execution/i),
    });
    expect(proposal.blockedActions).toEqual(expect.arrayContaining(DEFAULT_BLOCKED_ACTIONS));
    expect(validateAiActionProposal(proposal)).toEqual({ valid: true, errors: [] });
  });

  it('forbids unknown tools by default', () => {
    const proposal = buildAiActionProposal({
      toolId: 'unknown_future_mutation',
      summary: 'Try an unknown action.',
    });

    expect(proposal).toMatchObject({
      toolId: 'unknown_future_mutation',
      toolKnown: false,
      riskLevel: 'forbidden',
      executionMode: 'blocked',
      status: ACTION_PROPOSAL_STATUSES.BLOCKED,
      requiresApproval: false,
      blocked: true,
    });
    expect(proposal.blockedActions).toEqual(expect.arrayContaining(DEFAULT_BLOCKED_ACTIONS));
    expect(validateAiActionProposal(proposal)).toEqual({ valid: true, errors: [] });
  });

  it('blocks forbidden tax, payment, deletion, and direct DATEV actions', () => {
    [
      'delete_records',
      'submit_tax_or_elster',
      'pay_or_move_money',
      'direct_datev_upload',
    ].forEach((toolId) => {
      const proposal = buildAiActionProposal({ toolId });
      expect(proposal.status).toBe(ACTION_PROPOSAL_STATUSES.BLOCKED);
      expect(proposal.blocked).toBe(true);
      expect(proposal.executionMode).toBe('blocked');
      expect(proposal.allowedRoles).toEqual([]);
      expect(validateAiActionProposal(proposal)).toEqual({ valid: true, errors: [] });
    });
  });

  it('preserves advisory blocked actions and removes duplicates', () => {
    const proposal = buildAiActionProposal({
      toolId: 'analyze_document_intake',
      blockedActions: ['delete', 'pay', 'export'],
    });

    expect(proposal.status).toBe(ACTION_PROPOSAL_STATUSES.PROPOSAL_READY);
    expect(proposal.blocked).toBe(false);
    expect(proposal.blockedActions).toEqual(['post', 'approve', 'delete', 'reconcile', 'submit_tax', 'pay', 'export']);
    expect(validateAiActionProposal(proposal)).toEqual({ valid: true, errors: [] });
  });

  it('rejects malformed proposals during validation', () => {
    const result = validateAiActionProposal({
      type: 'wrong',
      schemaVersion: 'wrong',
      riskLevel: 'bad',
      executionMode: 'bad',
      status: 'bad',
      blocked: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Proposal type must be action_proposal.',
        'Proposal schemaVersion must be ai_action_proposal.v1.',
        'Proposal toolId is required.',
        'Proposal riskLevel is invalid.',
        'Proposal executionMode is invalid.',
        'Proposal status is invalid.',
      ]),
    );
  });

  it('prevents unblocked final posting or direct external submission proposals', () => {
    expect(
      validateAiActionProposal({
        ...buildAiActionProposal({ toolId: 'read_invoices' }),
        finalPosting: true,
      }).errors,
    ).toContain('Final posting proposals must remain blocked in Phase 6F.');

    expect(
      validateAiActionProposal({
        ...buildAiActionProposal({ toolId: 'read_invoices' }),
        directExternalSubmission: true,
      }).errors,
    ).toContain('Direct external submission proposals must remain blocked in Phase 6F.');
  });
});
