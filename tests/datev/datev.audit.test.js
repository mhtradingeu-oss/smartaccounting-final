import request from 'supertest';
import app from '../../src/app';

let authToken;
let testUser;

beforeEach(async () => {
  const result = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
  testUser = result.user;
  authToken = result.token;
});

import { AuditLog } from '../../src/models';

test('creates audit log entry for DATEV export', async () => {
  await request(app).get('/api/exports/datev').set('Authorization', `Bearer ${authToken}`).set('x-company-id', testUser.companyId).query({ fiscalYear: 2026 });

  const audit = await AuditLog.findOne({
    where: { action: 'EXPORT_DATEV' },
  });

  expect(audit).toBeTruthy();
  expect(audit.immutable).toBe(true);
});
