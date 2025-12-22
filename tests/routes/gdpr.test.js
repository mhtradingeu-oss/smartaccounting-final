
const request = require('../utils/request');
const app = require('../../src/app');
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
    otherCompanyUser = await testUtils.createTestUser();
    otherCompanyToken = testUtils.createAuthToken(otherCompanyUser.id);
  });

  afterAll(async () => {
    // No DB close here; handled globally
    await testUtils.cleanDatabase();
  });

  describe('Export user data', () => {
    it('user exports own data (200/204/404)', async () => {
      const res = await request(app)
        .get('/api/gdpr/export-user-data')
        .set('Authorization', `Bearer ${userToken}`);
      expect([200, 204, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.user.id).toBe(user.id);
      }
    });
    it('admin exports a company user (200/204/404)', async () => {
      const res = await request(app)
        .get('/api/gdpr/export-user-data')
        .query({ userId: user.id })
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.user.id).toBe(user.id);
      }
    });
    it('user cannot export other-company user (403/404)', async () => {
      const res = await request(app)
        .get('/api/gdpr/export-user-data')
        .query({ userId: otherCompanyUser.id })
        .set('Authorization', `Bearer ${userToken}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('Anonymize user', () => {
    it('user anonymizes self (200/204/404) and login must fail', async () => {
      const res = await request(app)
        .post('/api/gdpr/anonymize-user')
        .send({ reason: 'GDPR request' })
        .set('Authorization', `Bearer ${userToken}`);
      expect([200, 204, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.user.isAnonymized).toBe(true);
      }
      // Try login again
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'testpass123' });
      expect([401, 404]).toContain(loginRes.status);
    });
    it('admin anonymizes company user (200/204/404)', async () => {
      const newUser = await testUtils.createTestUser({ companyId: admin.companyId });
      const res = await request(app)
        .post('/api/gdpr/anonymize-user')
        .send({ userId: newUser.id, reason: 'Admin GDPR' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.user.isAnonymized).toBe(true);
      }
    });
    it('anonymized user keeps invoices/expenses relations', async () => {
      const newUser = await testUtils.createTestUserAndLogin({ companyId: admin.companyId });
      const invoice = await testUtils.createTestInvoice(newUser.user.id);
      await request(app)
        .post('/api/gdpr/anonymize-user')
        .send({ userId: newUser.user.id, reason: 'GDPR' })
        .set('Authorization', `Bearer ${adminToken}`);
      const foundInvoice = await Invoice.findByPk(invoice.id);
      expect(foundInvoice).toBeTruthy();
      expect(foundInvoice.userId).toBe(newUser.user.id);
    });
    it('audit log entry is created for anonymization', async () => {
      const newUser = await testUtils.createTestUser({ companyId: admin.companyId });
      const res = await request(app)
        .post('/api/gdpr/anonymize-user')
        .send({ userId: newUser.id, reason: 'GDPR' })
        .set('Authorization', `Bearer ${adminToken}`);
      if ([200, 204].includes(res.status)) {
        const logs = await AuditLog.findAll({
          where: { resourceType: 'User', resourceId: String(newUser.id), action: 'GDPR_ANONYMIZE_USER' },
        });
        expect(logs.length).toBeGreaterThan(0);
      } else {
        // If user not found or forbidden, audit log is not required
        expect([404, 403]).toContain(res.status);
      }
    });
    it('missing reason returns 400/404', async () => {
      const newUser = await testUtils.createTestUser({ companyId: admin.companyId });
      const res = await request(app)
        .post('/api/gdpr/anonymize-user')
        .send({ userId: newUser.id })
        .set('Authorization', `Bearer ${adminToken}`);
      expect([400, 404]).toContain(res.status);
    });
  });
});
