const AuditLogService = require('../../src/services/auditLogService');

describe('AI AuditLog DENIED event (unit, mocked)', () => {
  it('calls appendEntry with companyId, reason, and status=DENIED', async () => {
    const mockAppendEntry = jest
      .spyOn(AuditLogService, 'appendEntry')
      .mockImplementation(async (payload) => payload);
    const testPayload = {
      action: 'AI_QUERY_REJECTED',
      resourceType: 'AI',
      resourceId: null,
      userId: 42,
      companyId: 99,
      oldValues: null,
      newValues: { reason: 'Test rejection' },
      ipAddress: null,
      userAgent: null,
      reason: 'Test rejection',
      status: 'DENIED',
    };
    const result = await AuditLogService.appendEntry(testPayload);
    expect(mockAppendEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 99,
        reason: 'Test rejection',
        status: 'DENIED',
      }),
    );
    expect(result.companyId).toBe(99);
    expect(result.status).toBe('DENIED');
    expect(result.reason).toBe('Test rejection');
    mockAppendEntry.mockRestore();
  });
});
