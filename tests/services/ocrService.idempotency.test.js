jest.mock('../../src/services/guards/schemaGuard', () => ({
  checkTableAndColumns: jest.fn().mockResolvedValue(true),
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const ocrService = require('../../src/services/ocrService');
const { FileAttachment, AuditLog } = require('../../src/models');

const writeTempFile = (name, contents) => {
  const filePath = path.join(os.tmpdir(), `${name}-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, contents);
  return filePath;
};

describe('ocrService processDocument idempotency', () => {
  let filePath;
  let user;

  beforeEach(async () => {
    user = await global.testUtils.createTestUser();
    filePath = writeTempFile('ocr-idempotent', '%PDF-1.4\n%Mock\n');
    jest.spyOn(ocrService, 'validateDocument').mockResolvedValue({ valid: true });
    jest.spyOn(ocrService, 'preprocessImage').mockImplementation(async (pathValue) => pathValue);
    jest.spyOn(ocrService, 'extractText').mockResolvedValue({
      text: 'Invoice',
      confidence: 99,
    });
    jest.spyOn(ocrService, 'extractStructuredData').mockResolvedValue({
      type: 'invoice',
      invoiceNumber: 'INV-1',
    });
    jest.spyOn(ocrService, 'cleanup').mockResolvedValue();
  });

  afterEach(async () => {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const attachments = await FileAttachment.findAll({ where: { companyId: user.companyId } });
    attachments.forEach((attachment) => {
      if (attachment.filePath && fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
      }
    });
    await AuditLog.destroy({ where: { userId: user.id }, force: true });
    await FileAttachment.destroy({ where: { companyId: user.companyId }, force: true });
    await user.destroy({ force: true });
    jest.restoreAllMocks();
  });

  it('reuses the existing OCR record when the same file is processed twice', async () => {
    const first = await ocrService.processDocument(filePath, {
      documentType: 'invoice',
      userId: user.id,
      companyId: user.companyId,
      originalName: 'invoice.pdf',
    });

    const second = await ocrService.processDocument(filePath, {
      documentType: 'invoice',
      userId: user.id,
      companyId: user.companyId,
      originalName: 'invoice.pdf',
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(second.documentId).toBe(first.documentId);
    expect(ocrService.extractText).toHaveBeenCalledTimes(1);
  });
});
