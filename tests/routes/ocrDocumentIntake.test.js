const fs = require('fs');
const path = require('path');
const express = require('express');
const httpMocks = require('node-mocks-http');
const { EventEmitter } = require('events');

jest.mock('../../src/services/ocrService', () => {
  const actual = jest.requireActual('../../src/services/ocrService');
  return {
    ...actual,
    processDocument: jest.fn(),
    extractStructuredData: jest.fn(),
  };
});

const ocrRouter = require('../../src/routes/ocr');
const ocrService = require('../../src/services/ocrService');
const { Expense, FileAttachment, Invoice } = require('../../src/models');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.requestId = 'test-request-id';
  next();
});
app.use('/api/ocr', ocrRouter);
app.use((err, _req, res, _next) => {
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    code: err.code,
    message: err.message,
  });
});

const uploadFile = async (token, companyId, filePath, fields = {}) => {
  return new Promise((resolve) => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/ocr/intake/analyze',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': String(companyId),
        'content-type': 'application/json',
      },
      body: {
        documentType: fields.documentType || 'auto',
        languageHint: fields.languageHint || 'auto',
      },
    });
    req.file = {
      path: filePath,
      originalname: path.basename(filePath),
      filename: path.basename(filePath),
      mimetype: 'application/pdf',
      size: fs.statSync(filePath).size,
    };
    req.socket = req.socket || { setTimeout: () => {} };
    req.setTimeout = () => {};
    req.unpipe = () => {};

    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    res.on('end', () => {
      const raw = res._getData();
      let parsed = raw;
      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
      }
      resolve({ req, res, status: res.statusCode, body: parsed });
    });
    app(req, res);
  });
};

describe('OCR document intake analyze route', () => {
  const fixturePath = path.join('/tmp', 'ocr-intake-test.pdf');
  let admin;
  let accountant;
  let viewer;
  let otherAdmin;

  beforeAll(() => {
    fs.writeFileSync(fixturePath, '%PDF-1.4\n%Mock OCR intake\n');
  });

  beforeEach(async () => {
    admin = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    accountant = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });
    viewer = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });
    otherAdmin = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    ocrService.processDocument.mockReset();
    ocrService.extractStructuredData.mockReset();
  });

  afterEach(async () => {
    await FileAttachment.destroy({ where: {}, force: true });
    await Invoice.destroy({ where: {}, force: true });
    await Expense.destroy({ where: {}, force: true });
  });

  afterAll(() => {
    if (fs.existsSync(fixturePath)) {
      fs.unlinkSync(fixturePath);
    }
  });

  const mockReceiptOcr = async ({ user, companyId }) => {
    const attachment = await FileAttachment.create({
      fileName: 'receipt.pdf',
      originalName: 'receipt.pdf',
      filePath: fixturePath,
      fileSize: 123,
      mimeType: 'application/pdf',
      documentType: 'receipt',
      userId: user.id,
      companyId,
      uploadedBy: user.id,
      ocrText: 'Quittung DB Vertrieb GmbH Gesamt 11,90 EUR MwSt 1,90',
      ocrConfidence: 88,
      extractedData: { type: 'receipt', vendor: 'DB Vertrieb GmbH', amount: 11.9 },
      processingStatus: 'processed',
    });
    ocrService.processDocument.mockResolvedValue({
      success: true,
      documentId: attachment.id,
      text: attachment.ocrText,
      confidence: 88,
      extractedData: attachment.extractedData,
    });
    ocrService.extractStructuredData.mockResolvedValue(attachment.extractedData);
    return attachment;
  };

  it('returns advisory-only analysis and does not create invoices or expenses', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });

    const response = await uploadFile(accountant.token, accountant.user.companyId, fixturePath);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.classification.suggestedAction).toBe('create_expense_draft');
    expect(response.body.audit).toEqual(
      expect.objectContaining({
        advisoryOnly: true,
        requiresHumanConfirmation: true,
      }),
    );
    expect(response.body.audit.blockedActions).toEqual(['post', 'approve', 'delete', 'reconcile']);
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });

  it('rejects viewer role for persistent intake analysis', async () => {
    const response = await uploadFile(viewer.token, viewer.user.companyId, fixturePath);

    expect(response.status).toBe(403);
    expect(ocrService.processDocument).not.toHaveBeenCalled();
  });

  it('preserves company scoping for returned document', async () => {
    await mockReceiptOcr({ user: admin.user, companyId: admin.user.companyId });

    const response = await uploadFile(admin.token, admin.user.companyId, fixturePath);

    expect(response.status).toBe(200);
    const document = await FileAttachment.findByPk(response.body.document.id);
    expect(document.companyId).toBe(admin.user.companyId);
    expect(document.companyId).not.toBe(otherAdmin.user.companyId);
  });
});
