const { EventStore } = require('../../src/models');
const {
  createSafeDraftExecutionService,
} = require('../../src/services/ai/safeDraftExecutionService');
const {
  startEventCore,
} = require('../../src/services/enterprise/event-core/bootstrapEventCore');
const {
  getUnifiedTimeline,
} = require('../../src/services/enterprise/unified-read-model/unifiedTimelineService');

describe('F11-2-H execution EventStore proof', () => {
  beforeAll(() => {
    startEventCore();
  });

  beforeEach(async () => {
    await EventStore.destroy({ where: {} });
  });

  it('persists safe execution evidence and exposes it through the unified timeline', async () => {
    const approvalId = `aiap_event_proof_${Date.now()}`;
    const companyId = String(global.testCompany.id);
    const userId = String(global.testUser.id);
    const correlationId = `ocr-request-${Date.now()}`;
    const documentId = '11111111-1111-4111-8111-111111111111';

    const approval = {
      approvalId,
      companyId,
      status: 'approved',
      decision: 'approve',
      blocked: false,
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      requiresApproval: true,
      actionProposal: { blocked: false },
      metadata: {
        requestId: correlationId,
        documentId,
        decisionFingerprint: 'f11-2-h-proof-fingerprint',
        draftKind: 'expense',
      },
    };

    const approvalRepository = {
      getByIdForCompany: jest.fn().mockResolvedValue(approval),
      claimExecution: jest.fn().mockResolvedValue({
        success: true,
        item: { ...approval, status: 'executing' },
      }),
      recordPostDraftRecovery: jest.fn().mockResolvedValue({
        success: true,
        item: { ...approval, status: 'executing' },
      }),
      completeExecution: jest.fn().mockResolvedValue({
        success: true,
        item: { ...approval, status: 'executed' },
      }),
      failExecution: jest.fn(),
    };

    const service = createSafeDraftExecutionService({
      approvalRepository,
      draftService: {
        createDraftFromReviewedDocument: jest.fn().mockResolvedValue({
          draft: {
            type: 'expense',
            id: 901,
            status: 'pending',
          },
          decisionFingerprint: approval.metadata.decisionFingerprint,
        }),
      },
    });

    const result = await service.executeApprovedSafeDraft({
      approvalId,
      companyId,
      userId,
      requestId: 'execution-request-does-not-replace-origin',
    });

    expect(result.correlationId).toBe(correlationId);

    const persisted = await EventStore.findAll({
      where: {
        companyId,
        entityType: 'ApprovalQueue',
        entityId: approvalId,
      },
      order: [['createdAt', 'ASC']],
    });

    expect(persisted).toHaveLength(2);
    expect(persisted.map((event) => event.eventType)).toEqual([
      'execution.started',
      'execution.completed',
    ]);

    for (const event of persisted) {
      expect(event.metadata).toMatchObject({
        correlationId,
        source: 'safe_draft_execution',
      });
      expect(event.payload).toMatchObject({
        approvalId,
        documentId,
        entityId: approvalId,
      });
    }

    expect(persisted[1].payload).toMatchObject({
      draftType: 'expense',
      draftId: 901,
      draftStatus: 'pending',
    });

    const timeline = await getUnifiedTimeline(approvalId, companyId);

    expect(timeline.sources.eventStore).toBe(2);
    expect(timeline.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'execution.started',
          entityId: approvalId,
          companyId,
          correlationId,
          source: 'event_store',
        }),
        expect.objectContaining({
          type: 'execution.completed',
          entityId: approvalId,
          companyId,
          correlationId,
          source: 'event_store',
        }),
      ]),
    );
  });
});
