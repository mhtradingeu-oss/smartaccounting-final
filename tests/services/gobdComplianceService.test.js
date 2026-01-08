const GoBDComplianceService = require('../../src/services/gobdComplianceService');
const { User, Company, AuditLog } = require('../../src/models');

describe('GoBDComplianceService SystemContext compliance', () => {
  let company, user, validContext;
  const buildSystemContext = require('../utils/buildSystemContext');
  beforeAll(async () => {
    company = await Company.create({
      name: 'LegalTestCo',
      taxId: 'DE999999999',
      address: 'Legalstr. 1',
      city: 'Frankfurt',
      postalCode: '60311',
      country: 'DE',
    });
    user = await User.create({
      email: 'legaltest@example.com',
      password: 'testpass',
      firstName: 'Legal',
      lastName: 'Tester',
      role: 'admin',
      companyId: company.id,
    });
    validContext = buildSystemContext();
  });

  it('throws if companyId is missing, but reason, status, actorType, eventClass, and scopeType are valid', async () => {
    const badContext = { ...validContext };
    badContext.reason = 'audit';
    badContext.status = 'SUCCESS';
    badContext.actorType = 'USER';
    badContext.eventClass = 'ACCOUNTING';
    badContext.scopeType = 'COMPANY';
    delete badContext.companyId;
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.toThrow(/companyId/);
  });

  it('creates audit entry for valid COMPANY context', async () => {
    const goodContext = { ...validContext };
    goodContext.reason = 'audit';
    goodContext.status = 'SUCCESS';
    goodContext.actorType = 'USER';
    goodContext.eventClass = 'ACCOUNTING';
    goodContext.scopeType = 'COMPANY';
    goodContext.companyId = company.id;
    goodContext.actorId = user.id;
    const entry = await GoBDComplianceService.createImmutableRecord(
      'test_action',
      { foo: 'bar' },
      user.id,
      'transaction',
      goodContext,
    );
    expect(entry).toBeTruthy();
    // GoBD audit log check
    const auditEntry = await AuditLog.findOne({
      where: { resourceType: 'transaction', resourceId: String(entry.resourceId) },
    });
    expect(auditEntry).toBeTruthy();
    expect(auditEntry.immutable).toBe(true);
    if (auditEntry.metadata) {
      if (auditEntry.metadata.requestIp !== undefined) {
        expect(auditEntry.metadata.requestIp).toBeDefined();
      }
      if (auditEntry.metadata.userAgent !== undefined) {
        expect(auditEntry.metadata.userAgent).toBeDefined();
      }
    }
  });
});

describe('GoBDComplianceService SystemContext enforcement', () => {
  let company, user, validContext;
  const buildSystemContext = require('../utils/buildSystemContext');
  beforeAll(async () => {
    company = await Company.create({
      name: 'TestCo',
      country: 'DE',
      taxId: 'DE123456789',
      address: 'Teststr. 1',
      city: 'Berlin',
      postalCode: '10115',
    });
    user = await User.create({
      email: 'test@co.com',
      password: 'x',
      firstName: 'A',
      lastName: 'B',
      role: 'admin',
      companyId: company.id,
    });
    validContext = buildSystemContext();
    validContext.companyId = company.id;
    validContext.actorId = user.id;
    validContext.reason = 'audit';
    validContext.status = 'SUCCESS';
    validContext.actorType = 'USER';
    validContext.eventClass = 'ACCOUNTING';
    validContext.scopeType = 'COMPANY';
  });
  afterEach(async () => {
    await AuditLog.destroy({ where: {} });
  });

  it('throws if companyId is missing in SystemContext and reason, status, actorType are valid', async () => {
    const badContext = { ...validContext };
    delete badContext.companyId;
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.toThrow(/companyId/);
  });

  it('throws error for missing actorType if reason and status are valid (should not check companyId)', async () => {
    const badContext = { ...validContext };
    delete badContext.actorType;
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.toThrow(/actorType/);
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.not.toThrow(/companyId/);
  });

  it('throws error for missing status if reason is valid (should not check actorType or companyId)', async () => {
    const badContext = { ...validContext };
    delete badContext.status;
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.toThrow(/status/);
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.not.toThrow(/actorType/);
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.not.toThrow(/companyId/);
  });

  it('throws error for missing reason (should not check status, actorType, or companyId)', async () => {
    const badContext = { ...validContext };
    delete badContext.reason;
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.toThrow(/reason/);
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.not.toThrow(/status/);
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.not.toThrow(/actorType/);
    await expect(
      GoBDComplianceService.createImmutableRecord(
        'test_action',
        { foo: 'bar' },
        user.id,
        'transaction',
        badContext,
      ),
    ).rejects.not.toThrow(/companyId/);
  });

  it('succeeds with valid COMPANY SystemContext', async () => {
    const goodContext = { ...validContext };
    goodContext.reason = 'audit';
    goodContext.status = 'SUCCESS';
    goodContext.actorType = 'USER';
    goodContext.eventClass = 'ACCOUNTING';
    goodContext.scopeType = 'COMPANY';
    goodContext.companyId = company.id;
    goodContext.actorId = user.id;
    const entry = await GoBDComplianceService.createImmutableRecord(
      'test_action',
      { foo: 'bar' },
      user.id,
      'transaction',
      goodContext,
    );
    expect(entry).not.toBeUndefined();
    const logs = await AuditLog.findAll({ order: [['createdAt', 'ASC']] });
    expect(logs.length).toBe(1);
    expect(logs[0].companyId).toBe(company.id);
  });
});
