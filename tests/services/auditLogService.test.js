
const AuditLogService = require('../../src/services/auditLogService');
const { AuditLog, User, Company, sequelize } = require('../../src/models');
const { withRequestContext } = require('../utils/testHelpers');

describe('GoBD AuditLogService', () => {
  let testUser;
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const company = await Company.create({
      name: 'TestCo',
      taxId: 'DE123456789',
      address: 'Teststr. 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
    });
    testUser = await User.create({
      email: 'auditlogtest@example.com',
      password: 'testpass',
      firstName: 'Audit',
      lastName: 'Logger',
      role: 'admin',
      companyId: company.id,
    });
  });

  afterEach(async () => {
    await AuditLog.destroy({ where: {} });
  });

  it('appends entries and forms a hash chain', async () => {
    await AuditLogService.appendEntry({
      action: 'test_create',
      resourceType: 'Test',
      resourceId: '1',
      userId: testUser.id,
      oldValues: null,
      newValues: { foo: 'bar' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'initial entry',
    });
    await AuditLogService.appendEntry({
      action: 'test_update',
      resourceType: 'Test',
      resourceId: '1',
      userId: testUser.id,
      oldValues: { foo: 'bar' },
      newValues: { foo: 'baz' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'follow-up entry',
    });
    const logs = await AuditLog.findAll({ order: [['timestamp', 'ASC']] });
    expect(logs.length).toBe(2);
    expect(logs[1].previousHash).toBe(logs[0].hash);
    expect(await AuditLogService.validateChain()).toBe(true);
  });

  it('detects tampering in the hash chain', async () => {
    await AuditLogService.appendEntry({
      action: 'test_create',
      resourceType: 'Test',
      resourceId: '1',
      userId: testUser.id,
      oldValues: null,
      newValues: { foo: 'bar' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'tamper entry',
    });
    // Tamper with the log
    const log = await AuditLog.findOne();
    log.action = 'tampered';
    await log.save();
    expect(await AuditLogService.validateChain()).toBe(false);
  });

  it('exports logs as JSON and CSV', async () => {
    await AuditLogService.appendEntry({
      action: 'test_export',
      resourceType: 'Test',
      resourceId: '1',
      userId: testUser.id,
      oldValues: null,
      newValues: { foo: 'bar' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'export request',
    });
    const json = await AuditLogService.exportLogs({ format: 'json' });
    expect(Array.isArray(json)).toBe(true);
    const csv = await AuditLogService.exportLogs({ format: 'csv' });
    expect(typeof csv).toBe('string');
    expect(csv).toMatch(/id,action,resourceType/);
  });

  it('requires a reason for every entry', async () => {
    await expect(
      AuditLogService.appendEntry({
        action: 'missing_reason',
        resourceType: 'Test',
        resourceId: '99',
        userId: testUser.id,
        oldValues: null,
        newValues: null,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).rejects.toThrow(/reason is required/);
  });

  it('maintains correlation metadata and filters by company', async () => {
    const correlationId = 'company-filter-test';
    await withRequestContext(correlationId, () =>
      AuditLogService.appendEntry({
        action: 'company_filter',
        resourceType: 'AuditTest',
        resourceId: 'company-1',
        userId: testUser.id,
        oldValues: null,
        newValues: { foo: 'bar' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: 'company export test',
      }),
    );

    const otherUser = await User.create({
      email: 'otheruser@example.com',
      password: 'otherpass',
      firstName: 'Other',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      companyId: null,
    });
    const otherCompany = await Company.create({
      name: 'OtherCo',
      taxId: 'DE000000001',
      address: 'Other 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
      userId: otherUser.id,
    });
    await otherUser.update({ companyId: otherCompany.id });

    await withRequestContext('other-correlation', () =>
      AuditLogService.appendEntry({
        action: 'company_filter',
        resourceType: 'AuditTest',
        resourceId: 'company-2',
        userId: otherUser.id,
        oldValues: null,
        newValues: { foo: 'baz' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: 'other company log',
      }),
    );

    const filteredLogs = await AuditLogService.exportLogs({ companyId: testUser.companyId });
    expect(filteredLogs).toHaveLength(1);
    expect(filteredLogs[0].userId).toBe(testUser.id);
    expect(filteredLogs[0].correlationId).toBe(correlationId);

    await AuditLog.destroy({ where: { userId: otherUser.id } });
    await otherCompany.destroy();
    await otherUser.destroy();
  });
});
