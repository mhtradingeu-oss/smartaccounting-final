jest.mock(
  '../../src/services/enterprise/unified-read-model/unifiedTimelineService',
  () => ({
    getUnifiedTimeline: jest.fn(),
  }),
);

const app = require('../../src/app');
const testUtils = require('../utils/testHelpers');
const {
  getUnifiedTimeline,
} = require('../../src/services/enterprise/unified-read-model/unifiedTimelineService');

describe('Enterprise unified timeline route security', () => {
  let company;
  let otherCompany;
  let sessions;

  const requestTimeline = ({
    token,
    companyId,
    url = '/api/enterprise/timeline',
  } = {}) => {
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (companyId !== undefined && companyId !== null) {
      headers['x-company-id'] = String(companyId);
    }

    return global.requestApp({
      app,
      method: 'GET',
      url,
      headers,
    });
  };

  beforeEach(async () => {
    await testUtils.cleanDatabase();

    company = await testUtils.createTestCompany();
    otherCompany = await testUtils.createTestCompany();

    sessions = {};

    for (const role of ['admin', 'accountant', 'auditor', 'viewer']) {
      sessions[role] = await testUtils.createTestUserAndLogin({
        role,
        companyId: company.id,
      });
    }

    getUnifiedTimeline.mockReset();
    getUnifiedTimeline.mockResolvedValue({
      entityId: null,
      companyId: company.id,
      count: 0,
      sources: {
        eventStore: 0,
        auditLogs: 0,
        ledger: 0,
        approvals: 0,
      },
      replayReady: true,
      timeline: [],
    });
  });

  afterAll(async () => {
    await testUtils.cleanDatabase();
  });

  it('rejects unauthenticated requests', async () => {
    const response = await requestTimeline({
      companyId: company.id,
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe(true);
    expect(response.body.errorCode).toBeDefined();
    expect(getUnifiedTimeline).not.toHaveBeenCalled();
  });

  it('requires explicit company context', async () => {
    const response = await requestTimeline({
      token: sessions.admin.token,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(true);
    expect(response.body.errorCode).toBe('COMPANY_CONTEXT_REQUIRED');
    expect(getUnifiedTimeline).not.toHaveBeenCalled();
  });

  it('rejects a company header that does not match the authenticated user', async () => {
    const response = await requestTimeline({
      token: sessions.admin.token,
      companyId: otherCompany.id,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe(true);
    expect(response.body.errorCode).toBe('COMPANY_CONTEXT_INVALID');
    expect(getUnifiedTimeline).not.toHaveBeenCalled();
  });

  it('rejects client-supplied query company scope', async () => {
    const response = await requestTimeline({
      token: sessions.admin.token,
      companyId: company.id,
      url: `/api/enterprise/timeline?companyId=${otherCompany.id}`,
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'COMPANY_SCOPE_CLIENT_OVERRIDE_FORBIDDEN',
      message: 'Company scope must be derived from authenticated context',
    });
    expect(getUnifiedTimeline).not.toHaveBeenCalled();
  });

  it.each(['admin', 'accountant', 'auditor', 'viewer'])(
    'allows %s to read the same-company timeline',
    async (role) => {
      const response = await requestTimeline({
        token: sessions[role].token,
        companyId: company.id,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        entityId: null,
        companyId: company.id,
        count: 0,
        timeline: [],
      });
      expect(getUnifiedTimeline).toHaveBeenCalledWith(null, company.id);
    },
  );

  it('passes the route entityId and backend companyId to the canonical service', async () => {
    getUnifiedTimeline.mockResolvedValueOnce({
      entityId: 'approval-123',
      companyId: company.id,
      count: 1,
      sources: {
        eventStore: 0,
        auditLogs: 0,
        ledger: 0,
        approvals: 1,
      },
      replayReady: true,
      timeline: [
        {
          type: 'approved',
          entityId: 'approval-123',
          companyId: company.id,
        },
      ],
    });

    const response = await requestTimeline({
      token: sessions.accountant.token,
      companyId: company.id,
      url: '/api/enterprise/timeline/approval-123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      entityId: 'approval-123',
      companyId: company.id,
      count: 1,
    });
    expect(getUnifiedTimeline).toHaveBeenCalledWith(
      'approval-123',
      company.id,
    );
  });

  it('preserves the canonical success response shape', async () => {
    getUnifiedTimeline.mockResolvedValueOnce({
      entityId: null,
      companyId: company.id,
      count: 2,
      sources: {
        eventStore: 0,
        auditLogs: 1,
        ledger: 0,
        approvals: 1,
      },
      replayReady: true,
      timeline: [{ type: 'requested' }, { type: 'approved' }],
    });

    const response = await requestTimeline({
      token: sessions.auditor.token,
      companyId: company.id,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      entityId: null,
      companyId: company.id,
      count: 2,
      sources: {
        eventStore: 0,
        auditLogs: 1,
        ledger: 0,
        approvals: 1,
      },
      replayReady: true,
      timeline: [{ type: 'requested' }, { type: 'approved' }],
    });
  });

  it('uses the canonical safe error response for service failures', async () => {
    getUnifiedTimeline.mockRejectedValueOnce(
      new Error('sensitive database failure'),
    );

    const response = await requestTimeline({
      token: sessions.admin.token,
      companyId: company.id,
    });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to load unified timeline',
    });
    expect(JSON.stringify(response.body)).not.toContain(
      'sensitive database failure',
    );
  });
});
