const app = require('../../src/app');
const { AIApprovalQueueItem } = require('../../src/models');

describe('AI Approval Queue read-only API', () => {
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

  it('does not expose approval decision or execution endpoints', async () => {
    const { user, token } = await global.testUtils.createTestUserAndLogin({ role: 'admin' });

    for (const url of [
      '/api/ai/approval-queue/approve',
      '/api/ai/approval-queue/reject',
      '/api/ai/approval-queue/execute',
    ]) {
      const response = await global.requestApp({
        app,
        method: 'POST',
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          'x-company-id': user.companyId,
        },
        body: {
          approvalId: 'approval_test',
        },
      });

      expect([404, 405]).toContain(response.status);
    }
  });
});
