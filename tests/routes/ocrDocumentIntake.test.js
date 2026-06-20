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
    extractPdfText: jest.fn(),
    extractStructuredData: jest.fn(),
  };
});

const ocrRouter = require('../../src/routes/ocr');
const ocrService = require('../../src/services/ocrService');
const { createApiTimeoutMiddleware } = require('../../src/middleware/apiTimeout');
const { Expense, FileAttachment, Invoice } = require('../../src/models');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.requestId = 'test-request-id';
  next();
});
app.use('/api', createApiTimeoutMiddleware());
app.use('/api/ocr', ocrRouter);
app.use((err, _req, res, _next) => {
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    code: err.code,
    message: err.message,
  });
});

const tinyPngBuffer = () =>
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );

const uploadFile = async (token, companyId, filePath, fields = {}) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, fields.content || tinyPngBuffer());
  }

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
      originalname: fields.originalName || path.basename(filePath),
      filename: fields.originalName || path.basename(filePath),
      mimetype: fields.mimetype || 'image/png',
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
      resolve({ req, res, status: res.statusCode, body: parsed, headers: res._getHeaders() });
    });
    app(req, res);
  });
};

const recheckDocument = async (token, companyId, documentId, body = {}) =>
  new Promise((resolve) => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: `/api/ocr/intake/${documentId}/recheck`,
      params: { documentId },
      headers: {
        Authorization: `Bearer ${token}`,
        'x-company-id': String(companyId),
        'content-type': 'application/json',
      },
      body,
    });
    req.socket = req.socket || { setTimeout: () => {} };
    req.setTimeout = () => {};

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
      resolve({ req, res, status: res.statusCode, body: parsed, headers: res._getHeaders() });
    });
    app(req, res);
  });

describe('OCR document intake analyze route', () => {
  const fixturePath = path.join('/tmp', 'ocr-intake-test.png');
  let admin;
  let accountant;
  let viewer;
  let otherAdmin;

  beforeAll(() => {
    fs.writeFileSync(fixturePath, tinyPngBuffer());
  });

  beforeEach(async () => {
    admin = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    accountant = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });
    viewer = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });
    otherAdmin = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    ocrService.processDocument.mockReset();
    ocrService.extractPdfText.mockReset();
    ocrService.extractPdfText.mockResolvedValue({
      success: false,
      text: '',
      error: 'No extractable PDF text found',
    });
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
      fileName: 'receipt.png',
      originalName: 'receipt.png',
      filePath: fixturePath,
      fileSize: 123,
      mimeType: 'image/png',
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
    expect(response.headers['x-api-timeout']).toBe('30000ms');
    expect(response.body.success).toBe(true);
    expect(response.body.classification.suggestedAction).toBe('create_expense_draft');
    expect(response.body.audit).toEqual(
      expect.objectContaining({
        advisoryOnly: true,
        requiresHumanConfirmation: true,
      }),
    );
    expect(response.body.reviewState).toEqual({
      status: 'needs_review',
      reviewRequired: true,
      reviewedByUserId: null,
      reviewedAt: null,
      hasUserCorrections: false,
      criticalFieldsReviewed: false,
    });
    expect(response.body.editablePayload).toEqual(
      expect.objectContaining({
        aiExtractedValues: expect.objectContaining({
          vendorName: 'DB Vertrieb GmbH',
          documentType: 'receipt',
        }),
        reviewedValues: null,
        fieldChanges: [],
      }),
    );
    expect(response.body.draftEligibility).toEqual(
      expect.objectContaining({
        eligible: false,
        reason: expect.stringMatching(/Review extracted fields/i),
      }),
    );
    expect(response.body.audit.blockedActions).toEqual(['post', 'approve', 'delete', 'reconcile']);
    const document = await FileAttachment.findByPk(response.body.document.id);
    expect(document.extractedData.intake.reviewState).toEqual(response.body.reviewState);
    expect(document.extractedData.intake.editablePayload.aiExtractedValues).toEqual(
      response.body.editablePayload.aiExtractedValues,
    );
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });

  it('analyzes extractable digital PDF text without creating invoices or expenses', async () => {
    const pdfPath = path.join('/tmp', 'ocr-intake-digital-text.pdf');
    const pdfText =
      'Quittung DB Vertrieb GmbH Rechnung Gesamt 11,90 EUR MwSt 1,90 Datum 17.06.2026';

    ocrService.extractPdfText.mockResolvedValue({
      success: true,
      text: pdfText,
      pages: 1,
      metadata: {},
    });
    ocrService.extractStructuredData.mockResolvedValue({
      type: 'receipt',
      vendor: 'DB Vertrieb GmbH',
      amount: 11.9,
      vatAmount: 1.9,
      date: '17.06.2026',
    });

    const response = await uploadFile(accountant.token, accountant.user.companyId, pdfPath, {
      mimetype: 'application/pdf',
      originalName: 'ocr-intake-digital-text.pdf',
      documentType: 'auto',
      content: '%PDF-1.4 digital text pdf placeholder',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.classification.suggestedAction).toBe('create_expense_draft');
    expect(response.body.ocr.rawText).toContain('DB Vertrieb GmbH');
    expect(response.body.reviewState).toEqual(
      expect.objectContaining({
        status: 'needs_review',
        reviewRequired: true,
        criticalFieldsReviewed: false,
      }),
    );
    expect(response.body.editablePayload).toEqual(
      expect.objectContaining({
        aiExtractedValues: expect.objectContaining({
          vendorName: 'DB Vertrieb GmbH',
          documentType: 'receipt',
        }),
        reviewedValues: null,
        fieldChanges: [],
      }),
    );
    expect(response.body.draftEligibility.eligible).toBe(false);
    expect(response.body.audit).toEqual(
      expect.objectContaining({
        advisoryOnly: true,
        requiresHumanConfirmation: true,
      }),
    );
    expect(ocrService.processDocument).not.toHaveBeenCalled();
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);

    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  });

  it('returns safe review-required analysis for unsupported PDF OCR runtime', async () => {
    const pdfPath = path.join('/tmp', 'ocr-intake-test-pdf-fallback.pdf');

    const response = await uploadFile(accountant.token, accountant.user.companyId, pdfPath, {
      mimetype: 'application/pdf',
      originalName: 'ocr-intake-test.pdf',
      documentType: 'auto',
      content: '%PDF-1.4 fake pdf content',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.classification).toEqual(
      expect.objectContaining({
        documentType: 'pdf',
        suggestedAction: 'ask_missing_data',
        confidence: 'low',
      }),
    );
    expect(response.body.validation).toEqual(
      expect.objectContaining({
        status: 'needs_review',
        errors: expect.arrayContaining(['PDF OCR is not available in this local runtime.']),
        missingFields: expect.arrayContaining(['readableDocumentImage']),
      }),
    );
    expect(response.body.draft).toBeNull();
    expect(response.body.reviewState).toEqual(
      expect.objectContaining({
        status: 'needs_review',
        reviewRequired: true,
        criticalFieldsReviewed: false,
      }),
    );
    expect(response.body.editablePayload).toEqual({
      aiExtractedValues: {},
      reviewedValues: null,
      fieldChanges: [],
    });
    expect(response.body.draftEligibility.eligible).toBe(false);
    expect(response.body.audit).toEqual(
      expect.objectContaining({
        advisoryOnly: true,
        requiresHumanConfirmation: true,
      }),
    );
    expect(ocrService.processDocument).not.toHaveBeenCalled();

    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  });

  it('rechecks reviewed values, records field changes, and creates no invoices or expenses', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const aiSnapshot = analyzeResponse.body.editablePayload.aiExtractedValues;
    const reviewedValues = {
      documentType: 'receipt',
      businessDirection: 'incoming',
      vendorName: 'DB Fernverkehr AG',
      documentDate: '2026-06-18',
      netAmount: 10,
      vatRate: 0.19,
      vatAmount: 1.9,
      grossAmount: 11.9,
      currency: 'EUR',
      accountingCategory: 'travel',
      businessPurpose: 'Train ticket to client meeting',
      paymentMethod: 'card',
    };

    const response = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues,
        changeReason: 'Corrected OCR fields before draft',
        manualOverride: null,
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.reviewState).toEqual(
      expect.objectContaining({
        status: 'rechecked',
        reviewRequired: true,
        reviewedByUserId: accountant.user.id,
        hasUserCorrections: true,
        criticalFieldsReviewed: true,
      }),
    );
    expect(new Date(response.body.reviewState.reviewedAt).toString()).not.toBe('Invalid Date');
    expect(response.body.editablePayload.aiExtractedValues).toEqual(aiSnapshot);
    expect(response.body.editablePayload.reviewedValues).toEqual(reviewedValues);
    expect(response.body.editablePayload.fieldChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vendorName',
          aiValue: 'DB Vertrieb GmbH',
          correctedValue: 'DB Fernverkehr AG',
          userId: accountant.user.id,
          reason: 'Corrected OCR fields before draft',
        }),
      ]),
    );
    expect(new Date(response.body.editablePayload.fieldChanges[0].timestamp).toString()).not.toBe(
      'Invalid Date',
    );
    expect(response.body.draftEligibility.eligible).toBe(false);
    expect(response.body.decisionFingerprint).toEqual(expect.any(String));

    const document = await FileAttachment.findByPk(analyzeResponse.body.document.id);
    expect(document.extractedData.intake.reviewState.status).toBe('rechecked');
    expect(document.extractedData.intake.editablePayload.aiExtractedValues).toEqual(aiSnapshot);
    expect(document.extractedData.intake.editablePayload.reviewedValues).toEqual(reviewedValues);
    expect(document.extractedData.intake.editablePayload.fieldChanges).toEqual(
      response.body.editablePayload.fieldChanges,
    );
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });

  it('keeps recheck scoped to the active company', async () => {
    await mockReceiptOcr({ user: admin.user, companyId: admin.user.companyId });
    const analyzeResponse = await uploadFile(admin.token, admin.user.companyId, fixturePath);

    const response = await recheckDocument(
      otherAdmin.token,
      otherAdmin.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: {
          documentType: 'receipt',
          vendorName: 'Other Company Vendor',
          grossAmount: 11.9,
          currency: 'EUR',
        },
        changeReason: 'Review extracted fields',
      },
    );

    expect(response.status).toBe(404);
  });

  it('rejects empty reviewed values for recheck', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );

    const response = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      { reviewedValues: {} },
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/reviewedValues must be a non-empty object/i);
  });

  it('rejects manual override during Phase A2 recheck', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );

    const response = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: { documentType: 'receipt', vendorName: 'DB Vertrieb GmbH' },
        manualOverride: { reason: 'Not available in this phase' },
      },
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Manual override is not implemented in Phase A2/i);
  });

  it('rechecks invalid VAT math as correction needed without creating invoices or expenses', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );

    const response = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: {
          documentType: 'invoice',
          vendorName: 'Supplier GmbH',
          documentNumber: 'R-1',
          documentDate: '2026-06-18',
          netAmount: 100,
          vatRate: 0.19,
          vatAmount: 10,
          grossAmount: 119,
          currency: 'EUR',
        },
        changeReason: 'Re-check document after field review',
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.reviewState.status).toBe('rechecked');
    expect(response.body.validation.status).toBe('needs_correction');
    expect(response.body.validation.errors.join(' ')).toMatch(/Net \+ VAT/i);
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
