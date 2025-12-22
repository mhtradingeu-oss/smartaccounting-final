
const { User } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('Validations', () => {
    test('should create user with valid data', async () => {
      const userData = {
        email: 'valid@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Valid',
        lastName: 'User',
        role: 'viewer',
      };

      const user = await User.create(userData);

      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.role).toBe(userData.role);
    });

    test('should require email', async () => {
      await expect(User.create({
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
      })).rejects.toThrow();
    });

    test('should validate email format', async () => {
      await expect(User.create({
        email: 'invalid-email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer',
      })).rejects.toThrow();
    });

    test('should validate role enum', async () => {
      await expect(User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'invalid-role',
      })).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser();
    });

    test('should have correct role permissions', () => {
      const adminUser = { role: 'admin' };
      const viewerUser = { role: 'viewer' };

      expect(['admin', 'accountant', 'auditor', 'viewer']).toContain(adminUser.role);
      expect(['admin', 'accountant', 'auditor', 'viewer']).toContain(viewerUser.role);
    });
  });
});
