const express = require('express');
const usersRoutes = require('../../src/routes/users');
const { User } = require('../../src/models');

let mockCurrentUser = { id: 1, role: 'admin', companyId: null };

jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { ...mockCurrentUser };
    req.userId = mockCurrentUser.id;
    req.companyId = mockCurrentUser.companyId;
    next();
  },
  requireCompany: (req, _res, next) => {
    req.companyId = req.companyId || mockCurrentUser.companyId;
    next();
  },
  requireRole: () => (req, _res, next) => next(),
}));

jest.mock('../../src/services/auditLogService', () => ({
  appendEntry: jest.fn().mockResolvedValue(true),
}));
const AuditLogService = require('../../src/services/auditLogService');

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('User deletion guard', () => {
  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    const admin = await global.testUtils.createTestUser();
    mockCurrentUser = { id: admin.id, role: admin.role, companyId: admin.companyId };
    AuditLogService.appendEntry.mockClear();
  });

  it('blocks deletions and logs the attempt', async () => {
    const targetUser = await global.testUtils.createTestUser({ companyId: mockCurrentUser.companyId });
    const response = await global.requestApp({
      app,
      method: 'DELETE',
      url: `/api/users/${targetUser.id}`,
      body: { reason: 'GDPR requires anonymization' },
      headers: { 'x-company-id': mockCurrentUser.companyId },
    });
    expect(response.status).toBe(405);
    expect(response.body.error).toMatch(/anonymize/i);
    expect(AuditLogService.appendEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_DELETE_BLOCKED',
        resourceType: 'User',
        resourceId: String(targetUser.id),
        userId: mockCurrentUser.id,
        newValues: expect.objectContaining({ reason: 'GDPR requires anonymization' }),
      }),
    );
  });

  it('still returns 404 when the user does not exist', async () => {
    const response = await global.requestApp({
      app,
      method: 'DELETE',
      url: '/api/users/123456',
      headers: { 'x-company-id': mockCurrentUser.companyId },
    });
    expect(response.status).toBe(404);
    expect(AuditLogService.appendEntry).not.toHaveBeenCalled();
  });
});
