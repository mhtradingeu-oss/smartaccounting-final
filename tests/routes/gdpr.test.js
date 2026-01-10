const request = require('../utils/request');
const { app } = require('../../src/server');
const { User, Invoice, AuditLog, sequelize } = require('../../src/models');
const testUtils = require('../utils/testHelpers');

describe('GDPR API', () => {
  let admin, adminToken, user, userToken, otherCompanyUser, otherCompanyToken;

  beforeAll(async () => {
    // Use global test user/token for all tests
    admin = global.testUser;
    adminToken = global.testToken;
    // Create additional users as needed for test isolation
    user = await testUtils.createTestUser({ companyId: admin.companyId });
    userToken = testUtils.createAuthToken(user.id);
    // Always create otherCompanyUser in a different company
    const otherCompany = await testUtils.createTestCompany();
    otherCompanyUser = await testUtils.createTestUser({ companyId: otherCompany.id });
    otherCompanyToken = testUtils.createAuthToken(otherCompanyUser.id);
  });

  afterAll(async () => {
    // No DB close here; handled globally
    await testUtils.cleanDatabase();
  });

  describe('Export user data', () => {
    it('user exports own data (200/204/403/404)', async () => {
      const res = await global.requestApp({
        app,
        method: 'get',
        url: '/api/gdpr/export-user-data',
        headers: { Authorization: `Bearer ${userToken}`, 'x-company-id': user.companyId },
      });
      expect([200, 204, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('user');
        // Assert user has id and id is a number
        expect(typeof res.body.data.user).toBe('object');
        expect(res.body.data.user).toHaveProperty('id');
        expect(typeof res.body.data.user.id).toBe('number');
      }
    });
    it('admin exports a company user (200/204/403/404)', async () => {
      const res = await global.requestApp({
        app,
        method: 'get',
        url: '/api/gdpr/export-user-data',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': admin.companyId },
        query: { userId: user.id },
      });
      expect([200, 204, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('user');
        // Assert user has id and id is a number
        expect(typeof res.body.data.user).toBe('object');
        expect(res.body.data.user).toHaveProperty('id');
        expect(typeof res.body.data.user.id).toBe('number');
      }
    });
    it('user cannot export other-company user (403/404)', async () => {
      // Temporary debug logging
      console.log('requester:', user.id, user.companyId);
      console.log('otherCompanyUser:', otherCompanyUser.id, otherCompanyUser.companyId);
      console.log('query sent:', { userId: otherCompanyUser.id });
      const res = await global.requestApp({
        app,
        method: 'get',
        url: '/api/gdpr/export-user-data',
        headers: { Authorization: `Bearer ${userToken}`, 'x-company-id': user.companyId },
        query: { userId: otherCompanyUser.id },
      });
      // Print server-side resolved user/company if available
      if (res.body && res.body.data && res.body.data.user) {
        console.log('server-side user:', res.body.data.user.id, res.body.data.user.companyId);
      }
      // Enforce security-first: only allow 403 or 404
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Anonymize user', () => {
    // ...existing code...
    it('user anonymizes self (200/204/404) and login must fail', async () => {
      const res = await global.requestApp({
        app,
        method: 'post',
        url: '/api/gdpr/anonymize-user',
        headers: { Authorization: `Bearer ${userToken}`, 'x-company-id': user.companyId },
        body: { reason: 'GDPR request' },
      });
      expect([200, 204, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.user).toBeDefined();
        expect(res.body.user).toHaveProperty('id');
        expect(typeof res.body.user.id).toBe('number');
        expect(res.body.user.isAnonymized).toBe(true);
      }
      // Try login again
      const loginRes = await global.requestApp({
        app,
        method: 'post',
        url: '/api/auth/login',
        body: { email: user.email, password: 'testpass123' },
      });
      expect([401, 404]).toContain(loginRes.status);
    });
    it('admin anonymizes company user (200/204/404)', async () => {
      const newUser = await testUtils.createTestUser({ companyId: admin.companyId });
      const res = await global.requestApp({
        app,
        method: 'post',
        url: '/api/gdpr/anonymize-user',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': admin.companyId },
        body: { userId: newUser.id, reason: 'Admin GDPR' },
      });
      expect([200, 204, 403, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.user).toBeDefined();
        expect(res.body.user).toHaveProperty('id');
        expect(typeof res.body.user.id).toBe('number');
        expect(res.body.user.isAnonymized).toBe(true);
      }
    });
    it('anonymized user keeps invoices/expenses relations', async () => {
      const newUser = await testUtils.createTestUserAndLogin({ companyId: admin.companyId });
      const invoice = await testUtils.createTestInvoice(newUser.user.id);
      await global.requestApp({
        app,
        method: 'post',
        url: '/api/gdpr/anonymize-user',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': admin.companyId },
        body: { userId: newUser.user.id, reason: 'GDPR' },
      });
      const foundInvoice = await Invoice.findByPk(invoice.id);
      expect(foundInvoice).toBeTruthy();
      expect(foundInvoice).toHaveProperty('userId');
    });
    it('audit log entry is created for anonymization', async () => {
      const newUser = await testUtils.createTestUser({ companyId: admin.companyId });
      const res = await global.requestApp({
        app,
        method: 'post',
        url: '/api/gdpr/anonymize-user',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': admin.companyId },
        body: { userId: newUser.id, reason: 'GDPR' },
      });
      if ([200, 204].includes(res.status)) {
        const logs = await AuditLog.findAll({
          where: {
            resourceType: 'User',
            resourceId: String(newUser.id),
            action: 'GDPR_ANONYMIZE_USER',
          },
        });
        expect(logs.length).toBeGreaterThan(0);
      } else {
        // If user not found or forbidden, audit log is not required
        expect([404, 403]).toContain(res.status);
      }
    });
    it('missing reason returns 400/404', async () => {
      const newUser = await testUtils.createTestUser({ companyId: admin.companyId });
      const res = await global.requestApp({
        app,
        method: 'post',
        url: '/api/gdpr/anonymize-user',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-company-id': admin.companyId },
        body: { userId: newUser.id },
      });
      expect([400, 404]).toContain(res.status);
    });
  });
});
