const app = require('../../src/app');

describe('Exports PDF gating and content', () => {
  let auditorToken;
  let viewerToken;
  let auditor;
  let viewer;

  beforeEach(async () => {
    const auditorResult = await global.testUtils.createTestUserAndLogin({ role: 'auditor' });
    auditor = auditorResult.user;
    auditorToken = auditorResult.token;
    const viewerResult = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });
    viewer = viewerResult.user;
    viewerToken = viewerResult.token;
  });

  afterEach(async () => {
    if (auditor) {
      await auditor.destroy({ force: true });
    }
    if (viewer) {
      await viewer.destroy({ force: true });
    }
  });

  it('blocks non-auditors from export endpoints', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/exports/audit-logs?format=pdf',
      headers: { Authorization: `Bearer ${viewerToken}`, 'x-company-id': viewer.companyId },
    });

    expect(response.status).toBe(403);
  });

  it('returns a PDF with correct headers and signature', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: '/api/exports/audit-logs?format=pdf',
      headers: { Authorization: `Bearer ${auditorToken}`, 'x-company-id': auditor.companyId },
    });

    expect(response.status).toBe(200);
    expect(response.res.getHeader('Content-Type')).toBe('application/pdf');
    expect(response.res.getHeader('Content-Disposition')).toMatch(/audit-logs\.pdf/);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.toString('utf8', 0, 4)).toBe('%PDF');
  });
});
