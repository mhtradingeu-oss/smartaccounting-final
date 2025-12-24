
const express = require('express');
const authRoutes = require('../../src/routes/auth');
const authService = require('../../src/services/authService');
const jwt = require('jsonwebtoken');
const { User } = require('../../src/models');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('Authentication Routes', () => {
  let sharedCompany;
  beforeAll(async () => {
    sharedCompany = await global.testUtils.createTestCompany({ name: 'AuthTestCo', taxId: 'DEAUTHTESTCO', address: 'Test St 1', city: 'Berlin', postalCode: '10115', country: 'Germany' });
  });
  afterAll(async () => {
    await global.testUtils.cleanDatabase();
  });
  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      await global.testUtils.cleanDatabase();
      testUser = await global.testUtils.createTestUser({
        email: 'test@example.com',
      });
    });

    test('should login with valid credentials', async () => {
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'testpass123',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject invalid credentials', async () => {
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('should reject non-existent user', async () => {
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.status).toBe(401);
    });

    test('should validate input fields', async () => {
      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'invalid-email',
          password: '',
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    beforeEach(async () => {
      await global.testUtils.cleanDatabase();
    });

    test('should register new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'viewer',
      };

      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/register',
        body: userData,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
    });

    test('should reject duplicate email', async () => {
      await global.testUtils.createTestUser({ email: 'test@example.com' });

      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/register',
        body: {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Another',
          lastName: 'User',
          role: 'viewer',
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Refresh token rotation & logout', () => {
    let rotationUser;

    beforeEach(async () => {
      await global.testUtils.cleanDatabase();
      rotationUser = await global.testUtils.createTestUser();
    });

    test('rotates refresh tokens and rejects the previous token', async () => {
      const loginResult = await authService.login({
        email: rotationUser.email,
        password: 'testpass123',
      });

      const firstRefresh = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/refresh',
        body: {
          refreshToken: loginResult.refreshToken,
        },
      });

      expect(firstRefresh.status).toBe(200);
      expect(firstRefresh.body.refreshToken).toBeDefined();
      expect(firstRefresh.body.refreshToken).not.toBe(loginResult.refreshToken);

      const reuseAttempt = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/refresh',
        body: {
          refreshToken: loginResult.refreshToken,
        },
      });

      expect(reuseAttempt.status).toBe(401);
    });

    test('logout revokes all active tokens for the user', async () => {
      const loginResult = await authService.login({
        email: rotationUser.email,
        password: 'testpass123',
      });

      const logoutResponse = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          Authorization: `Bearer ${loginResult.token}`,
        },
      });

      expect(logoutResponse.status).toBe(200);

      const refreshAfterLogout = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/refresh',
        body: {
          refreshToken: loginResult.refreshToken,
        },
      });

      expect(refreshAfterLogout.status).toBe(401);
    });

    test('enforces the 30-day session max age on refresh', async () => {
      const staleSessionStart = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const staleRefreshToken = jwt.sign(
        {
          userId: rotationUser.id,
          type: 'refresh',
          sessionStart: staleSessionStart,
        },
        process.env.JWT_SECRET || 'test-jwt-secret',
        {
          expiresIn: '10d',
          jwtid: 'stale-session-jti',
        },
      );

      const response = await global.requestApp({
        app,
        method: 'POST',
        url: '/api/auth/refresh',
        body: {
          refreshToken: staleRefreshToken,
        },
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Session expired/i);
    });
  });
});
