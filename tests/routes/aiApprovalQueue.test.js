const app = require('../../src/app');
const crypto = require('crypto');
const { AIApprovalQueueItem, Expense, FileAttachment, Invoice } = require('../../src/models');

describe('AI Approval Queue API', () => {
  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
  });

  afterAll(async () => {
    await global.testUtils.cleanDatabase();
  });
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
      message:
        'AI approval queue is persisted. No approval queue items are currently pending review.',
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
  }) =>
    AIApprovalQueueItem.create({
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

  const createReviewedDocument = async ({ companyId, userId, draftKind }) => {
    const documentId = crypto.randomUUID();
    const decisionFingerprint = `route-execution-${draftKind}-${documentId}`;
    const isInvoice = draftKind === 'invoice';
    const reviewedValues = isInvoice
      ? {
          documentType: 'customer_invoice',
          businessDirection: 'outgoing',
          customerName: 'Route Test Customer GmbH',
          documentNumber: `INV-${Date.now()}`,
          documentDate: '2026-07-01',
          dueDate: '2026-07-15',
          netAmount: 100,
          vatRate: 0.19,
          vatAmount: 19,
          grossAmount: 119,
          currency: 'EUR',
          businessPurpose: 'Controlled invoice draft execution',
        }
      : {
          documentType: 'receipt',
          businessDirection: 'incoming',
          vendorName: 'Route Test Vendor GmbH',
          documentDate: '2026-07-01',
          netAmount: 10,
          vatRate: 0.19,
          vatAmount: 1.9,
          grossAmount: 11.9,
          currency: 'EUR',
          accountingCategory: 'travel',
          businessPurpose: 'Controlled expense draft execution',
        };

    await FileAttachment.create({
      id: documentId,
      fileName: `${draftKind}.pdf`,
      originalName: `${draftKind}.pdf`,
      filePath: `/tmp/${draftKind}.pdf`,
      mimeType: 'application/pdf',
      documentType: reviewedValues.documentType,
      companyId,
      userId,
      uploadedBy: userId,
      processingStatus: 'processed',
      extractedData: {
        intake: {
          classification: {
            documentType: reviewedValues.documentType,
            direction: reviewedValues.businessDirection,
            suggestedAction: isInvoice ? 'create_invoice_draft' : 'create_expense_draft',
          },
          validation: {
            status: 'ready_for_review',
            errors: [],
            missingFields: [],
          },
          reviewState: {
            status: 'rechecked',
            criticalFieldsReviewed: true,
          },
          editablePayload: {
            reviewedValues,
            fieldChanges: [],
          },
          draftEligibility: { eligible: true },
          decisionFingerprint,
        },
      },
    });

    return { documentId, decisionFingerprint };
  };

  const createExecutableApproval = async ({
    approvalId,
    companyId,
    userId,
    draftKind = 'expense',
    status = 'approved',
    decision = 'approve',
    toolId,
    metadata = {},
  }) => {
    const document = await createReviewedDocument({ companyId, userId, draftKind });
    const resolvedToolId = toolId || `create_${draftKind}_draft_from_reviewed_document`;

    await AIApprovalQueueItem.create({
      approvalId,
      schemaVersion: 'ai_approval_queue.v1',
      companyId,
      requestedByUserId: userId,
      decidedByUserId: status === 'pending' ? null : userId,
      status,
      decision: status === 'pending' ? null : decision,
      toolId: resolvedToolId,
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      blocked: false,
      requestedBy: 'ai_document_intake',
      approvalReason: 'Reviewed values are ready for controlled draft execution.',
      actionProposal: {
        type: 'action_proposal',
        toolId: resolvedToolId,
        riskLevel: 'draft_write',
        executionMode: 'prepare_draft',
        requiresApproval: true,
        blocked: false,
      },
      metadata: {
        documentId: document.documentId,
        decisionFingerprint: document.decisionFingerprint,
        draftKind,
        ...metadata,
      },
      auditRequired: true,
      expiresAt: new Date(Date.now() + 3600000),
      decidedAt: status === 'pending' ? null : new Date(),
    });

    return document;
  };

  const executeApproval = ({ actor, approvalId, reason = 'Execute reviewed draft' }) =>
    global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/execute',
      headers: {
        Authorization: `Bearer ${actor.token}`,
        'x-company-id': actor.user.companyId,
        'User-Agent': 'f9-c-route-test',
      },
      body: { approvalId, reason },
    });

  it('allows an admin to execute an approved expense draft', async () => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const approvalId = `aiap_execute_expense_${Date.now()}`;
    await createExecutableApproval({
      approvalId,
      companyId: actor.user.companyId,
      userId: actor.user.id,
    });

    const response = await executeApproval({ actor, approvalId });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      result: {
        approvalId,
        companyId: actor.user.companyId,
        toolId: 'create_expense_draft_from_reviewed_document',
        executionMode: 'prepare_draft',
        draft: { type: 'expense', status: 'pending' },
      },
      meta: {
        companyId: actor.user.companyId,
        executionEnabled: true,
        executionScope: 'reviewed_document_drafts_only',
      },
    });
    expect(await Expense.count({ where: { companyId: actor.user.companyId } })).toBe(1);
  });

  it('allows only one draft when two execute requests race for the same approval', async () => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const approvalId = `aiap_execute_race_${Date.now()}`;

    await createExecutableApproval({
      approvalId,
      companyId: actor.user.companyId,
      userId: actor.user.id,
      draftKind: 'expense',
    });

    const responses = await Promise.all([
      executeApproval({
        actor,
        approvalId,
        reason: 'Execute approved reviewed draft concurrently.',
      }),
      executeApproval({
        actor,
        approvalId,
        reason: 'Execute approved reviewed draft concurrently.',
      }),
    ]);

    const statuses = responses.map((response) => response.status);
    const successResponses = responses.filter((response) => response.status === 200);
    const conflictResponses = responses.filter((response) => response.status === 409);

    expect(successResponses.length).toBeGreaterThanOrEqual(1);

    const isSuccessAndConflict = successResponses.length === 1 && conflictResponses.length === 1;
    const isIdempotentDoubleSuccess = successResponses.length === 2;

    expect(isSuccessAndConflict || isIdempotentDoubleSuccess).toBe(true);

    if (isSuccessAndConflict) {
      expect(['AI_APPROVAL_EXECUTION_IN_PROGRESS', 'AI_APPROVAL_NOT_APPROVED']).toContain(
        conflictResponses[0].body?.errorCode,
      );
    }

    if (isIdempotentDoubleSuccess) {
      expect(successResponses[1].body).toMatchObject({
        success: true,
        result: {
          approvalId,
          companyId: actor.user.companyId,
          draft: { type: 'expense' },
        },
      });
    }

    expect(statuses.every((status) => status === 200 || status === 409)).toBe(true);

    const finalExpenseCount = await Expense.count({ where: { companyId: actor.user.companyId } });
    expect(finalExpenseCount).toBe(1);

    const createdExpense = await Expense.findOne({
      where: { companyId: actor.user.companyId },
      order: [['createdAt', 'DESC']],
    });

    expect(createdExpense).toBeTruthy();

    const approvalRecord = await AIApprovalQueueItem.findOne({
      where: { approvalId, companyId: actor.user.companyId },
    });

    expect(approvalRecord).toBeTruthy();

    await approvalRecord.reload();

    expect(approvalRecord.status).toBe('executed');

    const metadata = approvalRecord.metadata || {};
    const execution = metadata.execution || {};
    const recovery = metadata.postDraftRecovery || {};

    await expect(
      AIApprovalQueueItem.count({ where: { approvalId, companyId: actor.user.companyId } }),
    ).resolves.toBe(1);

    expect(execution).toMatchObject({
      toolId: 'create_expense_draft_from_reviewed_document',
      draftType: 'expense',
    });

    expect(recovery).toMatchObject({
      state: 'completion_pending',
      toolId: 'create_expense_draft_from_reviewed_document',
      draftType: 'expense',
    });

    expect(String(execution.draftId)).toBe(String(createdExpense.id));
    expect(String(recovery.draftId)).toBe(String(createdExpense.id));
    expect(String(recovery.draftId)).toBe(String(execution.draftId));

    const successfulDraftIds = successResponses
      .map((response) => response.body?.result?.draft?.id)
      .filter((id) => id !== undefined && id !== null)
      .map((id) => String(id));

    expect(successfulDraftIds).toContain(String(createdExpense.id));
  });

  it('allows an accountant to execute an approved invoice draft', async () => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });
    const approvalId = `aiap_execute_invoice_${Date.now()}`;
    await createExecutableApproval({
      approvalId,
      companyId: actor.user.companyId,
      userId: actor.user.id,
      draftKind: 'invoice',
    });

    const response = await executeApproval({ actor, approvalId });

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({
      approvalId,
      toolId: 'create_invoice_draft_from_reviewed_document',
      draft: { type: 'invoice', status: 'DRAFT' },
    });
    expect(await Invoice.count({ where: { companyId: actor.user.companyId } })).toBe(1);
  });

  it.each(['viewer', 'auditor'])('forbids %s from executing approvals', async (role) => {
    const actor = await global.testUtils.createTestUserAndLogin({ role });
    const response = await executeApproval({ actor, approvalId: `aiap_forbidden_${role}` });
    expect(response.status).toBe(403);
  });

  it.each([
    [{ reason: 'Valid reason' }, /approvalId/i],
    [{ approvalId: 'aiap_missing_reason' }, /reason/i],
    [{ approvalId: 'aiap_short_reason', reason: 'x' }, /between 3 and 500/i],
  ])('validates the controlled execution request body', async (body, expectedError) => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/execute',
      headers: {
        Authorization: `Bearer ${actor.token}`,
        'x-company-id': actor.user.companyId,
      },
      body,
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(expectedError);
  });

  it('rejects execution references supplied by the client', async () => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ai/approval-queue/execute',
      headers: {
        Authorization: `Bearer ${actor.token}`,
        'x-company-id': actor.user.companyId,
      },
      body: {
        approvalId: 'aiap_untrusted_context',
        reason: 'Execute reviewed draft',
        companyId: actor.user.companyId,
      },
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/persisted approval/i);
  });

  it('does not execute an approval owned by another company', async () => {
    const owner = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const approvalId = `aiap_execute_cross_company_${Date.now()}`;
    await createExecutableApproval({
      approvalId,
      companyId: owner.user.companyId,
      userId: owner.user.id,
    });

    const response = await executeApproval({ actor, approvalId });

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('AI_APPROVAL_NOT_FOUND');
    expect(await Expense.count({ where: { companyId: owner.user.companyId } })).toBe(0);
  });

  it.each([
    ['pending', null],
    ['rejected', 'reject'],
  ])('does not execute a %s approval', async (status, decision) => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const approvalId = `aiap_execute_${status}_${Date.now()}`;
    await createExecutableApproval({
      approvalId,
      companyId: actor.user.companyId,
      userId: actor.user.id,
      status,
      decision,
    });

    const response = await executeApproval({ actor, approvalId });

    expect(response.status).toBe(409);
    expect(response.body.errorCode).toBe('AI_APPROVAL_NOT_APPROVED');
    expect(await Expense.count({ where: { companyId: actor.user.companyId } })).toBe(0);
  });

  it('rejects an unsafe tool before draft creation', async () => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const approvalId = `aiap_execute_unsafe_${Date.now()}`;
    await createExecutableApproval({
      approvalId,
      companyId: actor.user.companyId,
      userId: actor.user.id,
      toolId: 'submit_tax_or_elster',
    });

    const response = await executeApproval({ actor, approvalId });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('AI_APPROVAL_TOOL_NOT_ALLOWED');
    expect(await Expense.count({ where: { companyId: actor.user.companyId } })).toBe(0);
  });

  it('preserves service error status and code', async () => {
    const actor = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    const approvalId = `aiap_execute_error_${Date.now()}`;
    await createExecutableApproval({
      approvalId,
      companyId: actor.user.companyId,
      userId: actor.user.id,
      metadata: { documentId: null },
    });

    const response = await executeApproval({ actor, approvalId });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'AI_APPROVAL_DOCUMENT_ID_REQUIRED',
      message: 'Approval metadata documentId is required.',
    });
  });
});
