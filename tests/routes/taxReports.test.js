const bcrypt = require('bcryptjs');
const express = require('express');
const { TaxReport, User, AuditLog } = require('../../src/models');
const { withRequestContext } = require('../utils/testHelpers');

jest.mock('../../src/utils/disabledFeatureResponse', () => ({
  disabledFeatureHandler: () => (_req, _res, next) => next(),
}));

jest.mock('../../src/services/taxCalculator', () => ({
  generateTaxReport: jest.fn().mockResolvedValue({ summary: 'mocked' }),
}));
jest.mock('../../src/services/elsterService', () => ({
  exportToElster: jest.fn().mockResolvedValue('<xml><status>ok</status></xml>'),
}));

const { generateTaxReport: generateTaxReportMock } = require('../../src/services/taxCalculator');
const taxReportsRoutes = require('../../src/routes/taxReports');

const app = express();
app.use(express.json());
app.use('/api/tax-reports', taxReportsRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Tax Reports Routes', () => {
  let authToken;
  let currentUser;

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    generateTaxReportMock.mockClear();
    const result = await global.testUtils.createTestUserAndLogin();
    currentUser = result.user;
    authToken = result.token;
  });

  afterAll(async () => {
    await global.testUtils.cleanDatabase();
  });

  it('blocks unauthenticated access', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/tax-reports',
    });
    expect(response.status).toBe(401);
  });

  it('requires a company context', async () => {
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const orphanUser = await User.create({
      email: 'orphan@example.com',
      password: hashedPassword,
      firstName: 'Orphan',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      companyId: null,
    });
    const token = global.testUtils.createAuthToken(orphanUser.id);
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/tax-reports',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('COMPANY_REQUIRED');
  });

  it('supports pagination when listing tax reports', async () => {
    await TaxReport.create({
      companyId: currentUser.companyId,
      reportType: 'USt',
      period: JSON.stringify({ year: 2024, quarter: 1 }),
      year: 2024,
      data: {},
      status: 'draft',
      generatedAt: new Date(),
    });
    await TaxReport.create({
      companyId: currentUser.companyId,
      reportType: 'KSt',
      period: JSON.stringify({ year: 2024, quarter: 2 }),
      year: 2024,
      data: {},
      status: 'draft',
      generatedAt: new Date(),
    });

    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/tax-reports?page=2&limit=1',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.currentPage).toBe(2);
    expect(response.body.pages).toBe(2);
    expect(response.body.total).toBe(2);
    expect(response.body.taxReports).toHaveLength(1);
  });

  it('creates a tax report via POST', async () => {
    const payload = {
      reportType: 'USt',
      period: { year: 2024 },
    };

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/tax-reports',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

    expect(response.status).toBe(201);
    expect(response.body.taxReport).toBeDefined();
    expect(generateTaxReportMock).toHaveBeenCalledWith(currentUser.companyId, payload.reportType, payload.period);
  });

  it('logs audit entry for tax report creation', async () => {
    const payload = {
      reportType: 'USt',
      period: { year: 2024 },
    };

    const correlationId = `tax-report-create-${Date.now()}`;
    const response = await withRequestContext(correlationId, () =>
      global.requestApp({
        app,
        method: 'POST',
        url: '/api/tax-reports',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: payload,
      }),
    );

    expect(response.status).toBe(201);
    const logRecord = await AuditLog.findOne({
      where: {
        action: 'TAX_REPORT_CREATED',
        resourceId: String(response.body.taxReport.id),
      },
    });
    expect(logRecord).toBeTruthy();
    expect(logRecord.userId).toBe(currentUser.id);
    expect(logRecord.correlationId).toBe(correlationId);
    const logUser = await User.findByPk(logRecord.userId);
    expect(logUser?.companyId).toBe(currentUser.companyId);
  });

  it('logs audit entry for tax report previews', async () => {
    const payload = {
      reportType: 'USt',
      period: { year: 2024 },
    };

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/tax-reports/generate',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: payload,
    });

    expect(response.status).toBe(200);
    const logRecord = await AuditLog.findOne({
      where: {
        action: 'TAX_REPORT_PREVIEW_GENERATED',
        userId: currentUser.id,
      },
    });
    expect(logRecord).toBeTruthy();
    expect(logRecord.newValues?.reportType).toBe(payload.reportType);
  });

  it('logs audit entry for tax report exports', async () => {
    const taxReport = await TaxReport.create({
      companyId: currentUser.companyId,
      reportType: 'USt',
      period: JSON.stringify({ year: 2024 }),
      year: 2024,
      data: {},
      status: 'draft',
      generatedAt: new Date(),
    });

    const correlationId = `tax-report-export-${Date.now()}`;
    const response = await withRequestContext(correlationId, () =>
      global.requestApp({
        app,
        method: 'GET',
        url: `/api/tax-reports/${taxReport.id}/export/elster`,
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    const logRecord = await AuditLog.findOne({
      where: {
        action: 'TAX_REPORT_EXPORTED',
        resourceId: String(taxReport.id),
      },
    });
    expect(logRecord).toBeTruthy();
    expect(logRecord.userId).toBe(currentUser.id);
    expect(logRecord.correlationId).toBe(correlationId);
    const logUser = await User.findByPk(logRecord.userId);
    expect(logUser?.companyId).toBe(currentUser.companyId);
  });
});
