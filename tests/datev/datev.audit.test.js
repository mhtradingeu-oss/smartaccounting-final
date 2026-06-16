import request from 'supertest';
import app from '../../src/app';
import { AuditLog } from '../../src/models';

test('creates audit log entry for DATEV export', async () => {
  await request(app).get('/api/exports/datev').query({ fiscalYear: 2026 });

  const audit = await AuditLog.findOne({
    where: { action: 'EXPORT_DATEV' },
  });

  expect(audit).toBeTruthy();
  expect(audit.immutable).toBe(true);
});
