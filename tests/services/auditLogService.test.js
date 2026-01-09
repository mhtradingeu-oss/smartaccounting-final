const AuditLogService = require('../../src/services/auditLogService');
const { AuditLog, User, Company, sequelize } = require('../../src/models');

describe('GoBD AuditLogService', () => {
  let testUser, company;
  beforeEach(async () => {
    company = await Company.create({
      name: 'Audit GmbH',
      taxId: 'DE123456789',
      address: 'Teststr. 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
      aiEnabled: true,
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
    await User.destroy({ where: {} });
    await Company.destroy({ where: {} });
  });

  it('appends entries and forms a hash chain', async () => {
    await AuditLogService.appendEntry({
      action: 'test_create',
      resourceType: 'Test',
      resourceId: '1',
      userId: testUser.id,
      companyId: company.id,
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
      companyId: company.id,
      oldValues: { foo: 'bar' },
      newValues: { foo: 'baz' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'follow-up entry',
    });
    const logs = await AuditLog.findAll({ order: [['timestamp', 'ASC']] });
    expect(logs.length).toBe(2);
    expect(logs[1].previousHash).toBe(logs[0].hash);
    // GoBD: Chain must be valid if not tampered
    expect(await AuditLogService.validateChain()).toBe(true);
    // Validate hash and optional metadata
    logs.forEach((entry) => {
      expect(entry).toBeDefined();
      expect(entry.hash).toBeDefined();
      if (entry.newValues?.metadata) {
        expect(entry.newValues.metadata).toEqual(expect.objectContaining({}));
      }
    });
  });

  it('detects tampering in the hash chain', async () => {
    await AuditLogService.appendEntry({
      action: 'test_create',
      resourceType: 'Test',
      resourceId: '1',
      userId: testUser.id,
      companyId: company.id,
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
    // GoBD: Chain must be invalid if tampered
    expect(await AuditLogService.validateChain()).toBe(false);
  });

  it('exports logs as JSON and CSV', async () => {
    await AuditLogService.appendEntry({
      action: 'test_export',
      resourceType: 'Test',
      resourceId: '1',
      userId: testUser.id,
      companyId: company.id,
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
        companyId: company.id,
        oldValues: null,
        newValues: null,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).rejects.toThrow(/reason is required/);
  });

  it('fails when ACCOUNTING SystemContext lacks companyId', async () => {
    await expect(
      AuditLogService.appendEntry({
        action: 'missing_company',
        resourceType: 'Test',
        resourceId: 'missing-company',
        userId: testUser.id,
        oldValues: null,
        newValues: {},
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: 'accounting event',
        context: {
          actorType: 'USER',
          actorId: testUser.id,
          companyId: null,
        eventClass: 'ACCOUNTING',
        scopeType: 'COMPANY',
        status: 'SUCCESS',
        reason: 'accounting event in test',
        requestId: 'req-accounting-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        },
      }),
    ).rejects.toThrow(/companyId/);
  });

  it('fails when ACCOUNTING SystemContext misses actorType', async () => {
    await expect(
      AuditLogService.appendEntry({
        action: 'missing_actorType',
        resourceType: 'Test',
        resourceId: 'missing-actor',
        userId: testUser.id,
        oldValues: null,
        newValues: {},
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: 'accounting event',
        context: {
          actorType: null,
          actorId: testUser.id,
          companyId: company.id,
        eventClass: 'ACCOUNTING',
        scopeType: 'COMPANY',
        status: 'SUCCESS',
        reason: 'accounting event in test',
        requestId: 'req-accounting-2',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      }),
    ).rejects.toThrow(/actorType/);
  });

  it('detects tampering when timestamps reorder the chain', async () => {
    await AuditLogService.appendEntry({
      action: 'timestamp-order-1',
      resourceType: 'Test',
      resourceId: 'ts-order',
      userId: testUser.id,
      companyId: company.id,
      oldValues: null,
      newValues: {},
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'first entry',
    });

    await AuditLogService.appendEntry({
      action: 'timestamp-order-2',
      resourceType: 'Test',
      resourceId: 'ts-order',
      userId: testUser.id,
      companyId: company.id,
      oldValues: {},
      newValues: {},
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      reason: 'second entry',
    });

    const entries = await AuditLog.findAll({ order: [['timestamp', 'ASC']] });
    const secondEntry = entries[1];
    // Force timestamp to be earlier than the first entry but keep the hash
    await AuditLog.update(
      { timestamp: new Date(Date.now() - 60 * 60 * 1000) },
      { where: { id: secondEntry.id } },
    );

    expect(await AuditLogService.validateChain()).toBe(false);
  });
});
