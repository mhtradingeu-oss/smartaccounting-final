const express = require('express');

process.env.OCR_PREVIEW_ENABLED = 'true';

let mockCurrentUser = { id: null, role: 'admin', companyId: null };

const defaultPreviewResponse = {
  success: true,
  type: 'invoice',
  confidence: 0.92,
  fields: {
    total: '120.00',
    vat: '19%',
    vendor: 'Test Vendor',
  },
  extractedData: {
    total: '120.00',
    vat: '19%',
    vendor: 'Test Vendor',
  },
  warnings: [],
  explanations: [],
  text: 'Mock OCR text for invoice preview.',
};

jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { ...mockCurrentUser };
    req.userId = mockCurrentUser.id;
    req.companyId = mockCurrentUser.companyId;
    next();
  },
  requireCompany: (req, _res, next) => {
    req.companyId = req.companyId || mockCurrentUser.companyId;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

jest.mock('../../src/services/auditLogService', () => ({
  appendEntry: jest.fn().mockResolvedValue(true),
}));

const mockFileTemplate = {
  fieldname: 'document',
  originalname: 'invoice.pdf',
  filename: 'invoice.pdf',
  path: '/tmp/mock-invoice.pdf',
  mimetype: 'application/pdf',
  size: 1024,
};

let mockAttachFile = true;

jest.mock('../../src/middleware/secureUpload', () => ({
  createSecureUploader: () => ({
    single: () => (req, _res, next) => {
      if (mockAttachFile) {
        req.file = { ...mockFileTemplate };
      } else {
        req.file = undefined;
      }
      next();
    },
  }),
  logUploadMetadata: (_req, _res, next) => next(),
}));

jest.mock('../../src/services/ocrService', () => ({
  runOCRPreview: jest.fn().mockResolvedValue(defaultPreviewResponse),
}));

const AuditLogService = require('../../src/services/auditLogService');
const { runOCRPreview } = require('../../src/services/ocrService');
const ocrRoutes = require('../../src/routes/ocr');
const { FileAttachment } = require('../../src/models');

const app = express();
app.use(express.json());
app.use('/api/ocr', ocrRoutes);
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error' });
});

describe('OCR preview endpoint', () => {
  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    const user = await global.testUtils.createTestUser();
    mockCurrentUser = {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
    };
    runOCRPreview.mockReset();
    runOCRPreview.mockResolvedValue(defaultPreviewResponse);
    AuditLogService.appendEntry.mockClear();
    mockAttachFile = true;
  });

  it('returns preview data, logs the event, and leaves no attachment records', async () => {
    const previewPayload = {
      success: true,
      confidence: 87.4,
      extractedData: { type: 'invoice', vendor: 'Acme GmbH', amount: 120.5 },
      warnings: ['Missing IBAN'],
      explanations: ['Vendor extracted from header', 'Amounts recognized via keywords'],
      text: 'Sample OCR text.',
    };

    runOCRPreview.mockResolvedValue(previewPayload);
    const beforeCount = await FileAttachment.count();

    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ocr/preview',
      body: {
        documentType: 'invoice',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.type).toBe('invoice');
    expect(response.body.confidence).toBe(previewPayload.confidence);
    expect(response.body.fields).toEqual(previewPayload.extractedData);
    expect(response.body.warnings).toEqual(previewPayload.warnings);
    expect(response.body.explanations).toEqual(previewPayload.explanations);
    expect(response.body.rawText).toBe(previewPayload.text);

    expect(runOCRPreview).toHaveBeenCalledWith(expect.any(String), {
      documentType: 'invoice',
      userId: mockCurrentUser.id,
      companyId: mockCurrentUser.companyId,
    });
    expect(await FileAttachment.count()).toBe(beforeCount);
    expect(AuditLogService.appendEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ocr_preview',
        resourceType: 'ocr_preview',
        userId: mockCurrentUser.id,
        reason: expect.any(String),
        newValues: expect.objectContaining({
          documentType: 'invoice',
          confidence: previewPayload.confidence,
        }),
      }),
    );
  });

  it('returns 400 when no file is provided', async () => {
    mockAttachFile = false;
    const response = await global.requestApp({
      app,
      method: 'POST',
      url: '/api/ocr/preview',
    });
    expect(response.status).toBe(400);
    expect(runOCRPreview).not.toHaveBeenCalled();
  });
});
