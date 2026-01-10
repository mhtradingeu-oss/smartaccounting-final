const app = require('../../src/app');
const { FileAttachment } = require('../../src/models');

describe('OCR results scoping', () => {
  let owner;
  let outsider;
  let ownerToken;
  let outsiderToken;
  let document;

  beforeEach(async () => {
    const ownerResult = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    owner = ownerResult.user;
    ownerToken = ownerResult.token;
    const outsiderResult = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    outsider = outsiderResult.user;
    outsiderToken = outsiderResult.token;

    document = await FileAttachment.create({
      fileName: 'ocr-file.pdf',
      originalName: 'ocr-file.pdf',
      filePath: '/tmp/ocr-file.pdf',
      fileSize: 123,
      mimeType: 'application/pdf',
      documentType: 'invoice',
      userId: owner.id,
      companyId: owner.companyId,
      uploadedBy: owner.id,
      processingStatus: 'processed',
      extractedData: { invoiceNumber: 'INV-1' },
    });
  });

  afterEach(async () => {
    if (document) {
      await FileAttachment.destroy({ where: { id: document.id }, force: true });
    }
    if (owner) {
      await owner.destroy({ force: true });
    }
    if (outsider) {
      await outsider.destroy({ force: true });
    }
  });

  it('rejects access to OCR results from another company', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: `/api/ocr/results/${document.id}`,
      headers: { Authorization: `Bearer ${outsiderToken}`, 'x-company-id': outsider.companyId },
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/Document not found/i);
  });

  it('allows access to OCR results within the same company', async () => {
    const response = await global.requestApp({
      app,
      method: 'GET',
      url: `/api/ocr/results/${document.id}`,
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-company-id': owner.companyId },
    });

    expect(response.status).toBe(200);
    expect(response.body.document.id).toBe(document.id);
  });
});
