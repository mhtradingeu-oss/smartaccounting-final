const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = require('../../src/app');
const authService = require('../../src/services/authService');
const requestIdMiddleware = require('../../src/middleware/requestId');
const errorHandler = require('../../src/middleware/errorHandler');
const { authenticate, requireRole } = require('../../src/middleware/authMiddleware');
const { User } = require('../../src/models');

const LOGIN_PASSWORD = 'testpass123';

const loginViaApi = async (email) =>
  global.requestApp({
    app,
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password: LOGIN_PASSWORD },
  });

const createRoleUser = async (role) =>
  global.testUtils.createTestUser({
    role,
    email: `security-${role}-${Date.now()}@example.com`,
  });

const rbacTestRouter = express.Router();

rbacTestRouter.get('/admin-only', authenticate, requireRole(['admin']), (_req, res) => {
  res.json({ allowed: 'admin' });
});
rbacTestRouter.get('/accountant-only', authenticate, requireRole(['accountant']), (_req, res) => {
  res.json({ allowed: 'accountant' });
});
rbacTestRouter.get('/auditor-only', authenticate, requireRole(['auditor']), (_req, res) => {
  res.json({ allowed: 'auditor' });
});
rbacTestRouter.get('/viewer-only', authenticate, requireRole(['viewer']), (_req, res) => {
  res.json({ allowed: 'viewer' });
});

const rbacApp = express();
rbacApp.use(express.json());
rbacApp.use(rbacTestRouter);
rbacApp.use(errorHandler);

const errorApp = express();
errorApp.use(requestIdMiddleware);
errorApp.get('/boom', (_req, _res, next) => {
  next(new Error('boom'));
});
errorApp.use(errorHandler);

const requestRbac = (suffix, token) =>
  global.requestApp({
    app: rbacApp,
    method: 'GET',
    url: `/${suffix}`,
    headers: { Authorization: `Bearer ${token}` },
  });

describe('Security: Auth flow, RBAC, and middleware invariants', () => {
  describe('Authentication flow', () => {
    test('login issues tokens and /me returns the profile', async () => {
      const user = await createRoleUser('viewer');
      const loginRes = await loginViaApi(user.email);
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toMatchObject({
        success: true,
        user: expect.objectContaining({ email: user.email }),
      });
      expect(loginRes.body.token).toBeTruthy();

      const meRes = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${loginRes.body.token}` },
      });
      expect(meRes.status).toBe(200);
      expect(meRes.body.user?.email).toBe(user.email);
    });

    test('expired tokens are rejected with TOKEN_INVALID', async () => {
      const user = await createRoleUser('viewer');
      const expiredToken = jwt.sign(
        { userId: user.id, role: user.role, companyId: user.companyId },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' },
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
      const response = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(response.status).toBe(401);
      expect(response.body.errorCode).toBe('TOKEN_INVALID');
    });

    test('refresh endpoint rotates refresh tokens and rejects replayed values', async () => {
      const user = await createRoleUser('viewer');
      const loginResult = await authService.login({
        email: user.email,
        password: LOGIN_PASSWORD,
      });
      const { refreshToken } = loginResult;

      const refreshRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/refresh',
        body: { refreshToken },
      });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.token).toBeTruthy();
      expect(refreshRes.body.refreshToken).toBeTruthy();
      expect(refreshRes.body.refreshToken).not.toBe(refreshToken);

      const meResAfterRefresh = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${refreshRes.body.token}` },
      });
      expect(meResAfterRefresh.status).toBe(200);
      expect(meResAfterRefresh.body.user?.email).toBe(user.email);

      const replayRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/refresh',
        body: { refreshToken },
      });
      expect(replayRes.status).toBe(401);
      expect(replayRes.body.success).toBe(false);
    });

    test('logout revokes tokens and refreshes are blocked afterward', async () => {
      const user = await createRoleUser('viewer');
      const loginResult = await authService.login({
        email: user.email,
        password: LOGIN_PASSWORD,
      });
      const { token, refreshToken } = loginResult;

      const logoutRes = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/logout',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(logoutRes.status).toBe(200);

      const meAfterLogout = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(meAfterLogout.status).toBe(401);
      expect(meAfterLogout.body.errorCode).toBe('TOKEN_REVOKED');

      const refreshAfterLogout = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/refresh',
        body: { refreshToken },
      });
      expect(refreshAfterLogout.status).toBe(401);
      expect(refreshAfterLogout.body.success).toBe(false);
    });
  });

  describe('RBAC for each role', () => {
    test('admin can reach the admin-only guard', async () => {
      const admin = await createRoleUser('admin');
      const loginResult = await authService.login({
        email: admin.email,
        password: LOGIN_PASSWORD,
      });
      const response = await requestRbac('admin-only', loginResult.token);
      expect(response.status).toBe(200);
    });

    test('accountant can use accountant routes but is blocked from admin-only', async () => {
      const accountant = await createRoleUser('accountant');
      const loginResult = await authService.login({
        email: accountant.email,
        password: LOGIN_PASSWORD,
      });
      const allowed = await requestRbac('accountant-only', loginResult.token);
      expect(allowed.status).toBe(200);
      const blocked = await requestRbac('admin-only', loginResult.token);
      expect(blocked.status).toBe(403);
      expect(blocked.body.errorCode).toBe('INSUFFICIENT_ROLE');
    });

    test('auditor can access auditor-only routes but not accountant-only', async () => {
      const auditor = await createRoleUser('auditor');
      const loginResult = await authService.login({
        email: auditor.email,
        password: LOGIN_PASSWORD,
      });
      const allowed = await requestRbac('auditor-only', loginResult.token);
      expect(allowed.status).toBe(200);
      const blocked = await requestRbac('accountant-only', loginResult.token);
      expect(blocked.status).toBe(403);
      expect(blocked.body.errorCode).toBe('INSUFFICIENT_ROLE');
    });

    test('viewer is limited to viewer-only routes and denied auditor-specific', async () => {
      const viewer = await createRoleUser('viewer');
      const loginResult = await authService.login({
        email: viewer.email,
        password: LOGIN_PASSWORD,
      });
      const allowed = await requestRbac('viewer-only', loginResult.token);
      expect(allowed.status).toBe(200);
      const blocked = await requestRbac('auditor-only', loginResult.token);
      expect(blocked.status).toBe(403);
      expect(blocked.body.errorCode).toBe('INSUFFICIENT_ROLE');
    });
  });

  describe('Middleware invariants', () => {
    test('every response carries an X-Request-Id header', async () => {
      const healthRes = await global.requestApp({
        app,
        method: 'GET',
        url: '/health',
      });
      expect(healthRes.res.getHeader('X-Request-Id')).toBeTruthy();
    });

    test('error responses surface the requestId header and payload', async () => {
      const errorRes = await global.requestApp({
        app: errorApp,
        method: 'GET',
        url: '/boom',
      });
      expect(errorRes.status).toBe(500);
      expect(errorRes.body.requestId).toBeTruthy();
      expect(errorRes.res.getHeader('X-Request-Id')).toBeTruthy();
    });

    test('requireCompany rejects tokens without company context', async () => {
      const orphan = await User.create({
        email: `orphan-${Date.now()}@example.com`,
        password: await bcrypt.hash(LOGIN_PASSWORD, 10),
        firstName: 'NoCompany',
        lastName: 'User',
        role: 'accountant',
        isActive: true,
        companyId: null,
      });
      const loginResult = await authService.login({
        email: orphan.email,
        password: LOGIN_PASSWORD,
      });
      const companyRes = await global.requestApp({
        app,
        method: 'GET',
        url: '/api/companies',
        headers: {
          Authorization: `Bearer ${loginResult.token}`,
          'x-company-id': global.testCompany?.id,
        },
      });
      expect(companyRes.status).toBe(403);
      expect(companyRes.body.errorCode).toBe('COMPANY_CONTEXT_INVALID');
    });
  });
});
