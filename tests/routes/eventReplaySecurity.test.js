jest.mock(
  '../../src/services/enterprise/event-replay/eventReplayEngine',
  () => ({
    replayTimeline: jest.fn(),
  }),
);

jest.mock(
  '../../src/services/enterprise/event-replay/explanation/replayExplanationEngine',
  () => ({
    explainReplay: jest.fn(),
  }),
);

const request = require('supertest');
const app = require('../../src/app');
const testUtils = require('../utils/testHelpers');

const {
  replayTimeline,
} = require(
  '../../src/services/enterprise/event-replay/eventReplayEngine'
);

const {
  explainReplay,
} = require(
  '../../src/services/enterprise/event-replay/explanation/replayExplanationEngine'
);

describe('Enterprise replay route security', () => {
  let company;
  let otherCompany;
  let sessions;

  const requestReplay = ({
    role = 'admin',
    token,
    companyId,
    url = '/api/enterprise/replay',
  } = {}) => {
    const resolvedToken =
      token === undefined
        ? sessions?.[role]?.token
        : token;

    let req = request(app).get(url);

    if (resolvedToken) {
      req = req.set(
        'Authorization',
        `Bearer ${resolvedToken}`,
      );
    }

    if (companyId !== undefined && companyId !== null) {
      req = req.set(
        'x-company-id',
        String(companyId),
      );
    }

    return req;
  };

  beforeEach(async () => {
    await testUtils.cleanDatabase();

    company = await testUtils.createTestCompany();
    otherCompany = await testUtils.createTestCompany();

    sessions = {};

    for (const role of [
      'admin',
      'accountant',
      'auditor',
      'viewer',
    ]) {
      sessions[role] =
        await testUtils.createTestUserAndLogin({
          role,
          companyId: company.id,
        });
    }

    replayTimeline.mockReset();
    explainReplay.mockReset();

    replayTimeline.mockResolvedValue({
      success: true,
      mode: 'simulation',
      readOnly: true,
      writesPerformed: false,
      entityId: null,
      companyId: company.id,
      sourceTimeline: {
        count: 0,
        sources: {},
        replayReady: false,
      },
      replay: {
        replayReady: false,
        health: {
          status: 'empty',
          safeToExplain: false,
        },
        stepsCount: 0,
      },
    });

    explainReplay.mockResolvedValue({
      success: true,
      mode: 'explanation',
      readOnly: true,
      writesPerformed: false,
      entityId: null,
      companyId: company.id,
      decision: {
        canExplain: false,
        canWrite: false,
        requiresHumanReview: true,
        status: 'empty',
      },
    });
  });

  afterAll(async () => {
    await testUtils.cleanDatabase();
  });

  describe.each([
    {
      name: 'replay',
      baseUrl: '/api/enterprise/replay',
      service: replayTimeline,
    },
    {
      name: 'replay explanation',
      baseUrl: '/api/enterprise/replay/explain',
      service: explainReplay,
    },
  ])('$name security', ({ baseUrl, service }) => {
    it('rejects unauthenticated access', async () => {
      const response = await requestReplay({
        token: null,
        companyId: company.id,
        url: baseUrl,
      });

      expect(response.status).toBe(401);
      expect(service).not.toHaveBeenCalled();
    });

    it('requires company context', async () => {
      const response = await requestReplay({
        role: 'admin',
        url: baseUrl,
      });

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe(
        'COMPANY_CONTEXT_REQUIRED',
      );
      expect(service).not.toHaveBeenCalled();
    });

    it('rejects invalid company context', async () => {
      const response = await requestReplay({
        role: 'admin',
        companyId: otherCompany.id,
        url: baseUrl,
      });

      expect(response.status).toBe(403);
      expect(response.body.errorCode).toBe(
        'COMPANY_CONTEXT_INVALID',
      );
      expect(service).not.toHaveBeenCalled();
    });

    it('rejects client-supplied query company scope', async () => {
      const response = await requestReplay({
        role: 'admin',
        companyId: company.id,
        url: `${baseUrl}?companyId=${otherCompany.id}`,
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: true,
        errorCode:
          'COMPANY_SCOPE_CLIENT_OVERRIDE_FORBIDDEN',
        message:
          'Company scope must be derived from authenticated context',
      });
      expect(service).not.toHaveBeenCalled();
    });

    it.each([
      'admin',
      'auditor',
    ])(
      'allows %s same-company access',
      async (role) => {
        const response = await requestReplay({
          role,
          companyId: company.id,
          url: baseUrl,
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          readOnly: true,
          writesPerformed: false,
          companyId: company.id,
        });

        expect(service).toHaveBeenCalledWith(
          expect.objectContaining({
            entityId: null,
            companyId: company.id,
          }),
        );
      },
    );

    it.each([
      'accountant',
      'viewer',
    ])(
      'rejects %s access',
      async (role) => {
        const response = await requestReplay({
          role,
          companyId: company.id,
          url: baseUrl,
        });

        expect(response.status).toBe(403);
        expect(service).not.toHaveBeenCalled();
      },
    );

    it('passes route entityId and backend companyId', async () => {
      const response = await requestReplay({
        role: 'auditor',
        companyId: company.id,
        url: `${baseUrl}/entity-123`,
      });

      expect(response.status).toBe(200);
      expect(service).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'entity-123',
          companyId: company.id,
        }),
      );
    });

    it('does not leak service failure details', async () => {
      service.mockRejectedValueOnce(
        new Error('sensitive replay database failure'),
      );

      const response = await requestReplay({
        role: 'admin',
        companyId: company.id,
        url: baseUrl,
      });

      expect(response.status).toBe(500);
      expect(response.body.errorCode).toBe(
        'INTERNAL_ERROR',
      );
      expect(JSON.stringify(response.body)).not.toContain(
        'sensitive replay database failure',
      );
    });
  });
});
