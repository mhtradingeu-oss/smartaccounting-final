process.env.API_BASE_URL = '/api';

const app = require('../../src/app');

const {
  AccountingPeriod,
  AuditLog,
} = require('../../src/models');

const authHeaders = ({ token, companyId }) => ({
  Authorization: `Bearer ${token}`,
  'x-company-id': companyId,
});

const requestFor = ({
  method = 'get',
  url,
  token,
  companyId,
  body,
}) =>
  global.requestApp({
    app,
    method,
    url,
    headers: authHeaders({
      token,
      companyId,
    }),
    body,
  });

const createRoleSession = (role, companyId) =>
  global.testUtils.createTestUserAndLogin({
    role,
    companyId,
    email: `accounting-period-${role}-${companyId}@example.test`,
  });

describe('Accounting periods API', () => {
  let company;
  let otherCompany;
  let admin;
  let accountant;
  let auditor;
  let viewer;
  let otherAdmin;

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();

    company = await global.testUtils.createTestCompany();
    otherCompany = await global.testUtils.createTestCompany();

    admin = await createRoleSession('admin', company.id);
    accountant = await createRoleSession('accountant', company.id);
    auditor = await createRoleSession('auditor', company.id);
    viewer = await createRoleSession('viewer', company.id);
    otherAdmin = await createRoleSession('admin', otherCompany.id);
  });

  test.each(['admin', 'accountant', 'auditor', 'viewer'])(
    '%s can list accounting periods for the active company',
    async (role) => {
      const session = {
        admin,
        accountant,
        auditor,
        viewer,
      }[role];

      const ownPeriod = await AccountingPeriod.create({
        companyId: company.id,
        startDate: '2039-01-01',
        endDate: '2039-01-31',
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: admin.user.id,
        reason: 'Own company test period',
      });

      await AccountingPeriod.create({
        companyId: otherCompany.id,
        startDate: '2039-02-01',
        endDate: '2039-02-28',
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: otherAdmin.user.id,
        reason: 'Other company test period',
      });

      const response = await requestFor({
        method: 'get',
        url: '/api/accounting-periods',
        token: session.token,
        companyId: company.id,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.accountingPeriods)).toBe(true);
      expect(
        response.body.accountingPeriods.some(
          (period) => period.id === ownPeriod.id,
        ),
      ).toBe(true);
      expect(
        response.body.accountingPeriods.every(
          (period) => period.companyId === company.id,
        ),
      ).toBe(true);
    },
  );

  test.each(['admin', 'accountant'])(
    '%s can close an accounting period',
    async (role) => {
      const session = {
        admin,
        accountant,
      }[role];

      const response = await requestFor({
        method: 'post',
        url: '/api/accounting-periods/close',
        token: session.token,
        companyId: company.id,
        body: {
          startDate: '2040-01-01',
          endDate: '2040-01-31',
          reason: `${role} approved monthly closing`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accountingPeriod).toMatchObject({
        companyId: company.id,
        startDate: '2040-01-01',
        endDate: '2040-01-31',
        status: 'CLOSED',
      });

      const persistedPeriod = await AccountingPeriod.findByPk(
        response.body.accountingPeriod.id,
      );

      expect(persistedPeriod).toBeTruthy();
      expect(persistedPeriod.status).toBe('CLOSED');
      expect(persistedPeriod.closedBy).toBe(session.user.id);

      const auditLog = await AuditLog.findOne({
        where: {
          action: 'ACCOUNTING_PERIOD_CLOSED',
          resourceType: 'AccountingPeriod',
          resourceId: String(persistedPeriod.id),
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog.userId).toBe(session.user.id);
      expect(auditLog.companyId).toBe(company.id);
      expect(auditLog.reason).toBe(
        `${role} approved monthly closing`,
      );
      expect(auditLog.immutable).toBe(true);
    },
  );

  test.each(['viewer', 'auditor'])(
    '%s cannot close an accounting period',
    async (role) => {
      const session = {
        viewer,
        auditor,
      }[role];

      const response = await requestFor({
        method: 'post',
        url: '/api/accounting-periods/close',
        token: session.token,
        companyId: company.id,
        body: {
          startDate: '2040-02-01',
          endDate: '2040-02-29',
          reason: 'Unauthorized close attempt',
        },
      });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: true,
        errorCode: 'PERMISSION_DENIED',
      });

      expect(
        await AccountingPeriod.count({
          where: {
            companyId: company.id,
            startDate: '2040-02-01',
            endDate: '2040-02-29',
          },
        }),
      ).toBe(0);
    },
  );

  test('requires a documented reason when closing a period', async () => {
    const response = await requestFor({
      method: 'post',
      url: '/api/accounting-periods/close',
      token: accountant.token,
      companyId: company.id,
      body: {
        startDate: '2040-03-01',
        endDate: '2040-03-31',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'ACCOUNTING_PERIOD_REASON_REQUIRED',
    });
  });

  test('rejects invalid accounting period date ranges', async () => {
    const response = await requestFor({
      method: 'post',
      url: '/api/accounting-periods/close',
      token: accountant.token,
      companyId: company.id,
      body: {
        startDate: '2040-05-01',
        endDate: '2040-04-30',
        reason: 'Invalid range test',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'ACCOUNTING_PERIOD_RANGE_INVALID',
    });
  });

  test('rejects overlapping accounting periods', async () => {
    await AccountingPeriod.create({
      companyId: company.id,
      startDate: '2040-06-01',
      endDate: '2040-06-30',
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: admin.user.id,
      reason: 'Existing June close',
    });

    const response = await requestFor({
      method: 'post',
      url: '/api/accounting-periods/close',
      token: accountant.token,
      companyId: company.id,
      body: {
        startDate: '2040-06-15',
        endDate: '2040-07-15',
        reason: 'Overlapping close attempt',
      },
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'ACCOUNTING_PERIOD_OVERLAP',
    });
  });

  test('admin can reopen a closed accounting period with audit evidence', async () => {
    const period = await AccountingPeriod.create({
      companyId: company.id,
      startDate: '2041-01-01',
      endDate: '2041-01-31',
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: accountant.user.id,
      reason: 'Original monthly close',
    });

    const response = await requestFor({
      method: 'post',
      url: `/api/accounting-periods/${period.id}/reopen`,
      token: admin.token,
      companyId: company.id,
      body: {
        reason: 'Approved correction in January',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.accountingPeriod).toMatchObject({
      id: period.id,
      companyId: company.id,
      status: 'OPEN',
    });

    await period.reload();

    expect(period.status).toBe('OPEN');
    expect(period.reopenedBy).toBe(admin.user.id);
    expect(period.reopenedAt).toBeTruthy();

    const auditLog = await AuditLog.findOne({
      where: {
        action: 'ACCOUNTING_PERIOD_REOPENED',
        resourceType: 'AccountingPeriod',
        resourceId: String(period.id),
      },
    });

    expect(auditLog).toBeTruthy();
    expect(auditLog.userId).toBe(admin.user.id);
    expect(auditLog.companyId).toBe(company.id);
    expect(auditLog.reason).toBe(
      'Approved correction in January',
    );
    expect(auditLog.immutable).toBe(true);
  });

  test.each(['accountant', 'auditor', 'viewer'])(
    '%s cannot reopen a closed accounting period',
    async (role) => {
      const session = {
        accountant,
        auditor,
        viewer,
      }[role];

      const period = await AccountingPeriod.create({
        companyId: company.id,
        startDate: '2041-02-01',
        endDate: '2041-02-28',
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: admin.user.id,
        reason: 'Restricted reopen test',
      });

      const response = await requestFor({
        method: 'post',
        url: `/api/accounting-periods/${period.id}/reopen`,
        token: session.token,
        companyId: company.id,
        body: {
          reason: 'Unauthorized reopen attempt',
        },
      });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        error: true,
        errorCode: 'PERMISSION_DENIED',
      });

      await period.reload();
      expect(period.status).toBe('CLOSED');
    },
  );

  test('cannot reopen an accounting period belonging to another company', async () => {
    const otherPeriod = await AccountingPeriod.create({
      companyId: otherCompany.id,
      startDate: '2041-03-01',
      endDate: '2041-03-31',
      status: 'CLOSED',
      closedAt: new Date(),
      closedBy: otherAdmin.user.id,
      reason: 'Other company close',
    });

    const response = await requestFor({
      method: 'post',
      url: `/api/accounting-periods/${otherPeriod.id}/reopen`,
      token: admin.token,
      companyId: company.id,
      body: {
        reason: 'Cross-company reopen attempt',
      },
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'ACCOUNTING_PERIOD_NOT_FOUND',
    });

    await otherPeriod.reload();
    expect(otherPeriod.status).toBe('CLOSED');
  });

  test('rejects reopening a period that is already open', async () => {
    const period = await AccountingPeriod.create({
      companyId: company.id,
      startDate: '2041-04-01',
      endDate: '2041-04-30',
      status: 'OPEN',
      reason: 'Open period',
    });

    const response = await requestFor({
      method: 'post',
      url: `/api/accounting-periods/${period.id}/reopen`,
      token: admin.token,
      companyId: company.id,
      body: {
        reason: 'Invalid repeated reopen',
      },
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'ACCOUNTING_PERIOD_NOT_CLOSED',
    });
  });

  test('rejects invalid accounting period ids before database access', async () => {
    const response = await requestFor({
      method: 'post',
      url: '/api/accounting-periods/not-an-id/reopen',
      token: admin.token,
      companyId: company.id,
      body: {
        reason: 'Invalid id test',
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: true,
      errorCode: 'ACCOUNTING_PERIOD_ID_INVALID',
    });
  });
});
