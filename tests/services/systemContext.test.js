const { assertSystemContext } = require('../../src/services/systemContext');

describe('SystemContext Validator', () => {
  it('throws if ACCOUNTING event with companyId=null', () => {
    expect(() =>
      assertSystemContext({
        actorType: 'USER',
        actorId: 1,
        companyId: null,
        scopeType: 'COMPANY',
        eventClass: 'ACCOUNTING',
        requestId: 'req-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: 'Test',
        status: 'SUCCESS',
      }),
    ).toThrow(/companyId/);
  });

  it('throws if USER actorId missing', () => {
    expect(() =>
      assertSystemContext({
        actorType: 'USER',
        actorId: null,
        companyId: 2,
        scopeType: 'COMPANY',
        eventClass: 'ACCOUNTING',
        requestId: 'req-2',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: 'Test',
        status: 'SUCCESS',
      }),
    ).toThrow(/actorId/);
  });

  it('allows GLOBAL OPS with companyId=null', () => {
    expect(() =>
      assertSystemContext({
        actorType: 'SYSTEM',
        actorId: null,
        companyId: null,
        scopeType: 'GLOBAL',
        eventClass: 'OPS',
        requestId: 'req-3',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: 'Ops event',
        status: 'SUCCESS',
      }),
    ).not.toThrow();
  });

  it('throws if DENIED without reason', () => {
    expect(() =>
      assertSystemContext({
        actorType: 'USER',
        actorId: 1,
        companyId: 2,
        scopeType: 'COMPANY',
        eventClass: 'ACCOUNTING',
        requestId: 'req-4',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        reason: '',
        status: 'DENIED',
      }),
    ).toThrow(/reason/);
  });
});
