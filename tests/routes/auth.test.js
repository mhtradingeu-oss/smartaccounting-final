
const express = require('express');
const authRoutes = require('../../src/routes/auth');
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
});
