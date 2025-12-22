
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../src/models');

describe('Authentication Service', () => {
  describe('User Registration', () => {
    test('should create user with hashed password', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'viewer',
      };

      const user = await User.create({
        ...userData,
        password: await bcrypt.hash(userData.password, 10),
      });

      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    test('should not create user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'One',
        role: 'viewer',
      };

      await User.create({
        ...userData,
        password: await bcrypt.hash(userData.password, 10),
      });

      await expect(User.create({
        ...userData,
        password: await bcrypt.hash(userData.password, 10),
      })).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser();
    });

    test('should authenticate valid credentials', async () => {
      const isValid = await bcrypt.compare('testpass123', testUser.password);
      expect(isValid).toBe(true);
    });

    test('should reject invalid password', async () => {
      const isValid = await bcrypt.compare('wrongpassword', testUser.password);
      expect(isValid).toBe(false);
    });

    test('should generate valid JWT token', () => {
      const token = global.testUtils.createAuthToken(testUser.id);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
});
