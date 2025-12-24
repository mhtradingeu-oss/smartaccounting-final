const express = require('express');
const complianceRoutes = require('../../src/routes/compliance');

let mockCurrentUser = { id: 1, role: 'admin', companyId: null };

jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { ...mockCurrentUser };
    req.userId = mockCurrentUser.id;
    req.companyId = mockCurrentUser.companyId;
    next();
  },
  requireCompany: (req, res, next) => {
    const companyId = req.companyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company context is required for this resource',
      });
    }
    req.companyId = companyId;
    next();
  },
  requireRole: () => (req, _res, next) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/compliance', complianceRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Compliance routes', () => {
  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    const testUser = await global.testUtils.createTestUser();
    mockCurrentUser = {
      id: testUser.id,
      role: testUser.role,
      companyId: testUser.companyId,
    };
  });

  it('returns compliance reports scoped to the authenticated company', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/compliance/reports/monthly',
    });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      companyId: mockCurrentUser.companyId,
      type: 'monthly',
    });
  });

  it('rejects access when company context is missing', async () => {
    mockCurrentUser.companyId = null;
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/compliance/reports/monthly',
    });
    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/company context/i);
  });
});
