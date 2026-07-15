'use strict';

jest.mock(
  '../../src/services/reporting/bwa/bwaReportService',
  () => ({
    getBwaReport: jest.fn(),
  }),
);

const request = require('supertest');
const app = require('../../src/app');
const testUtils = require('../utils/testHelpers');

const {
  getBwaReport,
} = require('../../src/services/reporting/bwa/bwaReportService');

describe('BWA financial report route', () => {
  let company;
  let otherCompany;
  let sessions;

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

    getBwaReport.mockReset();
    getBwaReport.mockResolvedValue({
      companyId: company.id,
      definition: {
        id: 'de-bwa-01-skr03',
        version: 1,
        chartSystem: 'SKR03',
      },
      period: {
        year: 2026,
        fromMonth: 1,
        toMonth: 7,
        from: '2026-01-01',
        to: '2026-07-31',
        months: [
          '2026-01',
          '2026-02',
          '2026-03',
          '2026-04',
          '2026-05',
          '2026-06',
          '2026-07',
        ],
      },
      preliminary: true,
      months: [
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
      ],
      rows: [],
      unmappedAccounts: [],
      warnings: [],
      evidence: [],
      generatedAt: '2026-07-15T10:00:00.000Z',
    });
  });

  afterAll(async () => {
    await testUtils.cleanDatabase();
  });

  function requestBwa(token, query = '') {
    return request(app)
      .get(`/api/reports/bwa${query}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(company.id));
  }

  it('rejects unauthenticated access', async () => {
    const response = await request(app)
      .get('/api/reports/bwa?year=2026&toMonth=7');

    expect(response.status).toBe(401);
    expect(getBwaReport).not.toHaveBeenCalled();
  });

  it('requires explicit company context', async () => {
    const response = await request(app)
      .get('/api/reports/bwa?year=2026&toMonth=7')
      .set(
        'Authorization',
        `Bearer ${sessions.admin.token}`,
      );

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe(
      'COMPANY_CONTEXT_REQUIRED',
    );
    expect(getBwaReport).not.toHaveBeenCalled();
  });

  it('rejects company context belonging to another company', async () => {
    const response = await request(app)
      .get('/api/reports/bwa?year=2026&toMonth=7')
      .set(
        'Authorization',
        `Bearer ${sessions.admin.token}`,
      )
      .set(
        'x-company-id',
        String(otherCompany.id),
      );

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe(
      'COMPANY_CONTEXT_INVALID',
    );
    expect(getBwaReport).not.toHaveBeenCalled();
  });

  it('rejects client-supplied query company scope', async () => {
    const response = await requestBwa(
      sessions.admin.token,
      `?year=2026&toMonth=7&companyId=${otherCompany.id}`,
    );

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe(
      'COMPANY_SCOPE_CLIENT_OVERRIDE_FORBIDDEN',
    );
    expect(getBwaReport).not.toHaveBeenCalled();
  });

  it.each([
    'admin',
    'accountant',
    'auditor',
    'viewer',
  ])(
    'allows %s same-company BWA read',
    async (role) => {
      const response = await requestBwa(
        sessions[role].token,
        '?year=2026&toMonth=7',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        report: expect.objectContaining({
          companyId: company.id,
          preliminary: true,
          rows: [],
          warnings: [],
        }),
      });
    },
  );

  it('passes backend company scope and parsed period to the service', async () => {
    await requestBwa(
      sessions.admin.token,
      '?year=2026&toMonth=7',
    );

    expect(getBwaReport).toHaveBeenCalledWith({
      companyId: company.id,
      year: 2026,
      toMonth: 7,
      definitionId: undefined,
    });
  });

  it('passes an optional registered definition id', async () => {
    await requestBwa(
      sessions.admin.token,
      '?year=2026&toMonth=7&definitionId=de-bwa-01-skr03',
    );

    expect(getBwaReport).toHaveBeenCalledWith({
      companyId: company.id,
      year: 2026,
      toMonth: 7,
      definitionId: 'de-bwa-01-skr03',
    });
  });

  it.each([
    '',
    '?toMonth=7',
    '?year=abc&toMonth=7',
    '?year=2026abc&toMonth=7',
    '?year=2026.5&toMonth=7',
  ])(
    'rejects invalid or missing year: %s',
    async (query) => {
      const response = await requestBwa(
        sessions.admin.token,
        query,
      );

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe(
        'BWA_REPORT_INVALID_YEAR_QUERY',
      );
      expect(getBwaReport).not.toHaveBeenCalled();
    },
  );

  it.each([
    '?year=2026',
    '?year=2026&toMonth=0',
    '?year=2026&toMonth=13',
    '?year=2026&toMonth=abc',
    '?year=2026&toMonth=7abc',
    '?year=2026&toMonth=7.5',
  ])(
    'rejects invalid or missing toMonth: %s',
    async (query) => {
      const response = await requestBwa(
        sessions.admin.token,
        query,
      );

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe(
        'BWA_REPORT_INVALID_MONTH_QUERY',
      );
      expect(getBwaReport).not.toHaveBeenCalled();
    },
  );

  it('preserves a supported service validation error', async () => {
    getBwaReport.mockRejectedValueOnce(
      Object.assign(
        new Error('Unsupported BWA definition'),
        {
          code: 'BWA_REPORT_DEFINITION_NOT_FOUND',
          status: 400,
          statusCode: 400,
        },
      ),
    );

    const response = await requestBwa(
      sessions.admin.token,
      '?year=2026&toMonth=7&definitionId=missing',
    );

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe(
      'BWA_REPORT_DEFINITION_NOT_FOUND',
    );
  });

  it('does not leak unexpected internal service errors', async () => {
    getBwaReport.mockRejectedValueOnce(
      new Error('sensitive database failure'),
    );

    const response = await requestBwa(
      sessions.admin.token,
      '?year=2026&toMonth=7',
    );

    expect(response.status).toBe(500);
    expect(response.body.errorCode).toBe(
      'INTERNAL_ERROR',
    );
    expect(
      JSON.stringify(response.body),
    ).not.toContain(
      'sensitive database failure',
    );
  });
});
