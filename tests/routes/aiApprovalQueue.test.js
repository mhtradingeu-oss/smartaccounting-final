const app = require('../../src/app');
const { AIApprovalQueueItem } = require('../../src/models');

describe('AI Approval Queue API', () => {
  it('returns a safe persisted empty approval queue for viewer role', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/ai/approval-queue',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      persisted: true,
      items: [],
      message: 'AI approval queue is persisted. No approval queue items are currently pending review.',
      meta: {
        companyId: user.companyId,
        readOnly: true,
        executionEnabled: false,
        approvalDecisionsEnabled: false,
      },
    });
  });

  it('returns persisted approval queue items scoped to the authenticated company context', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const other = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    await AIApprovalQueueItem.create({
      approvalId: 'aiap_visible_test',
      schemaVersion: 'ai_approval_queue.v1',
      companyId: user.companyId,
      requestedByUserId: user.id,
      status: 'pending',
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
      requestedBy: 'ai_document_intake',
      approvalReason: 'Reviewed values are ready for draft creation.',
      actionProposal: {
        type: 'action_proposal',
        toolId: 'create_expense_draft_from_reviewed_document',
        preview: { vendorName: 'DB Vertrieb GmbH', grossAmount: 11.9 },
      },
      metadata: { test: true },
      auditRequired: true,
      expiresAt: new Date(Date.now() + 3600000),
    });

    await AIApprovalQueueItem.create({
      approvalId: 'aiap_hidden_other_company',
      schemaVersion: 'ai_approval_queue.v1',
      companyId: other.user.companyId,
      requestedByUserId: other.user.id,
      status: 'pending',
      toolId: 'create_invoice_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
      requestedBy: 'ai_document_intake',
      approvalReason: 'Other company item.',
      actionProposal: {
        type: 'action_proposal',
        toolId: 'create_invoice_draft_from_reviewed_document',
      },
      metadata: { test: true },
      auditRequired: true,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/ai/approval-queue',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.persisted).toBe(true);
    expect(response.body.meta.companyId).toBe(user.companyId);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: 'aiap_visible_test',
      approvalId: 'aiap_visible_test',
      status: 'pending',
      companyId: user.companyId,
      toolId: 'create_expense_draft_from_reviewed_document',
      requiresApproval: true,
      blocked: false,
      auditRequired: true,
    });
  });

  const createApprovalQueueItem = async ({
    approvalId = 'aiap_decision_test',
    companyId,
    requestedByUserId,
    status = 'pending',
    expiresAt = new Date(Date.now() + 3600000),
  }) => AIApprovalQueueItem.create({
    approvalId,
    schemaVersion: 'ai_approval_queue.v1',
    companyId,
    requestedByUserId,
    status,
    toolId: 'create_expense_draft_from_reviewed_document',
    riskLevel: 'draft_write',
    executionMode: 'prepare_draft',
    requiresApproval: true,
    blocked: false,
    requestedBy: 'ai_document_intake',
    approvalReason: 'Reviewed values are ready for draft creation.',
    actionProposal: {
      type: 'action_proposal',
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
      preview: { vendorName: 'DB Vertrieb GmbH', grossAmount: 11.9 },
    },
    metadata: { test: true },
    auditRequired: true,
    expiresAt,
  });

  it('approves a pending approval queue item for accountant role without executing it', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });

    await createApprovalQueueItem({
      approvalId: 'aiap_approve_test',
      companyId: user.companyId,
      requestedByUserId: user.id,
    });

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/approve',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
      body: {
        approvalId: 'aiap_approve_test',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      persisted: true,
      item: {
        approvalId: 'aiap_approve_test',
        status: 'approved',
        decision: 'approve',
        decidedByUserId: user.id,
      },
      meta: {
        companyId: user.companyId,
        readOnly: false,
        executionEnabled: false,
        approvalDecisionsEnabled: true,
      },
    });

    const record = await AIApprovalQueueItem.findOne({
      where: { approvalId: 'aiap_approve_test', companyId: user.companyId },
    });

    expect(record.status).toBe('approved');
    expect(record.decision).toBe('approve');
    expect(record.decidedByUserId).toBe(user.id);
    expect(record.decidedAt).toBeTruthy();
  });

  it('rejects a pending approval queue item only with a reason', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    await createApprovalQueueItem({
      approvalId: 'aiap_reject_test',
      companyId: user.companyId,
      requestedByUserId: user.id,
    });

    const missingReason = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/reject',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
      body: {
        approvalId: 'aiap_reject_test',
      },
    });

    expect(missingReason.status).toBe(400);
    expect(missingReason.body.error).toMatch(/reason/i);

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/reject',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
      body: {
        approvalId: 'aiap_reject_test',
        decisionReason: 'Vendor amount does not match reviewed receipt.',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.item).toMatchObject({
      approvalId: 'aiap_reject_test',
      status: 'rejected',
      decision: 'reject',
      decisionReason: 'Vendor amount does not match reviewed receipt.',
      decidedByUserId: user.id,
    });
  });

  it('blocks viewer and auditor roles from approval decisions', async () => {
    const owner = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const viewer = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });
    const auditor = await global.testUtils.createTestUserAndLogin({ role: 'auditor' });

    await createApprovalQueueItem({
      approvalId: 'aiap_role_block_test',
      companyId: owner.user.companyId,
      requestedByUserId: owner.user.id,
    });

    for (const actor of [viewer, auditor]) {
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/ai/approval-queue/approve',
        headers: {
          Authorization: `Bearer ${actor.token}`,
          'x-company-id': owner.user.companyId,
        },
        body: {
          approvalId: 'aiap_role_block_test',
        },
      });

      expect([403, 404]).toContain(response.status);
    }
  });

  it('keeps approval decisions scoped to the authenticated company', async () => {
    const owner = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const other = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    await createApprovalQueueItem({
      approvalId: 'aiap_cross_company_test',
      companyId: owner.user.companyId,
      requestedByUserId: owner.user.id,
    });

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/approve',
      headers: {
        Authorization: `Bearer ${other.token}`,
        'x-company-id': other.user.companyId,
      },
      body: {
        approvalId: 'aiap_cross_company_test',
      },
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/not found/i);

    const record = await AIApprovalQueueItem.findOne({
      where: { approvalId: 'aiap_cross_company_test', companyId: owner.user.companyId },
    });

    expect(record.status).toBe('pending');
    expect(record.decision).toBeNull();
  });

  it('keeps execution endpoint disabled while approval decisions are enabled', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/execute',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': user.companyId,
      },
      body: {
        approvalId: 'aiap_execute_test',
      },
    });

    expect([404, 405]).toContain(response.status);
  });
});
