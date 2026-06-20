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

jest.mock('../../src/middleware/rateLimiter', () => ({
  ocrLimiter: (_req, _res, next) => next(),
}));

const ocrRouter = require('../../src/routes/ocr');
const ocrService = require('../../src/services/ocrService');
const { createApiTimeoutMiddleware } = require('../../src/middleware/apiTimeout');
const { AuditLog, Expense, FileAttachment, Invoice } = require('../../src/models');

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

const createDraftFromReviewedDocument = async (token, companyId, documentId, body = {}) =>
  new Promise((resolve) => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: `/api/ocr/intake/${documentId}/create-draft`,
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
  let auditor;
  let otherAdmin;

  beforeAll(() => {
    fs.writeFileSync(fixturePath, tinyPngBuffer());
  });

  beforeEach(async () => {
    admin = await global.testUtils.createTestUserAndLogin({ role: 'admin' });
    accountant = await global.testUtils.createTestUserAndLogin({ role: 'accountant' });
    viewer = await global.testUtils.createTestUserAndLogin({ role: 'viewer' });
    auditor = await global.testUtils.createTestUserAndLogin({ role: 'auditor' });
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
    expect(response.body.draftEligibility.eligible).toBe(true);
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

  it('rejects incomplete manual override during recheck', async () => {
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
        manualOverride: { reason: 'Missing short description and acknowledgement' },
      },
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Manual override is incomplete/i);
  });


  it('records valid manual override during recheck without creating invoices or expenses', async () => {
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
          documentType: 'receipt',
          businessDirection: 'incoming',
          vendorName: 'Taxi Berlin GmbH',
          documentDate: '2026-06-18',
          netAmount: 100,
          vatRate: 0.19,
          vatAmount: 19,
          grossAmount: 119,
          currency: 'EUR',
          accountingCategory: 'travel',
          businessPurpose: 'Client meeting travel',
        },
        changeReason: 'Reviewed incomplete receipt with restricted tax treatment',
        manualOverride: {
          shortDescription: 'Taxi ride to client meeting',
          reason: 'Receipt is partially incomplete but documents a business expense',
          riskLevel: 'medium',
          restrictedTaxTreatmentAcknowledged: true,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.reviewState.status).toBe('rechecked');
    expect(response.body.editablePayload.reviewedValues).toEqual(
      expect.objectContaining({
        vendorName: 'Taxi Berlin GmbH',
        vatRate: 0,
        vatAmount: 0,
        taxTreatment: 'no_vorsteuer_allowed',
        inputVatAllowed: false,
        accountantReviewRequired: true,
      }),
    );
    expect(response.body.editablePayload.manualOverride).toEqual(
      expect.objectContaining({
        shortDescription: 'Taxi ride to client meeting',
        reason: 'Receipt is partially incomplete but documents a business expense',
        riskLevel: 'medium',
        restrictedTaxTreatmentAcknowledged: true,
      }),
    );
    expect(response.body.draftEligibility.restrictedTaxTreatment).toEqual(
      expect.objectContaining({
        taxTreatment: 'no_vorsteuer_allowed',
        inputVatAllowed: false,
        accountantReviewRequired: true,
      }),
    );
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);

    const document = await FileAttachment.findByPk(analyzeResponse.body.document.id);
    expect(document.extractedData.reviewedValues).toEqual(
      expect.objectContaining({
        vatRate: 0,
        vatAmount: 0,
        taxTreatment: 'no_vorsteuer_allowed',
        inputVatAllowed: false,
        accountantReviewRequired: true,
      }),
    );
    expect(document.extractedData.intake.editablePayload.manualOverride).toEqual(
      expect.objectContaining({
        riskLevel: 'medium',
        restrictedTaxTreatmentAcknowledged: true,
      }),
    );
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

  it('rejects create-draft before document recheck is complete', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: 'missing',
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(409);
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });

  it('rejects create-draft when critical fields were not reviewed', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const document = await FileAttachment.findByPk(analyzeResponse.body.document.id);
    const intake = {
      ...document.extractedData.intake,
      reviewState: {
        ...document.extractedData.intake.reviewState,
        status: 'rechecked',
        criticalFieldsReviewed: false,
      },
      editablePayload: {
        ...document.extractedData.intake.editablePayload,
        reviewedValues: {
          documentType: 'receipt',
          vendorName: 'Reviewed Vendor',
          grossAmount: 11.9,
          currency: 'EUR',
        },
      },
      decisionFingerprint: 'fingerprint-without-critical-review',
      draftEligibility: { eligible: true },
    };
    await document.update({ extractedData: { ...document.extractedData, intake } });

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      document.id,
      {
        decisionFingerprint: 'fingerprint-without-critical-review',
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(409);
  });

  it('rejects create-draft with stale or missing decision fingerprint', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const recheckResponse = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: {
          documentType: 'receipt',
          vendorName: 'Reviewed Vendor GmbH',
          documentDate: '2026-06-18',
          netAmount: 10,
          vatRate: 0.19,
          vatAmount: 1.9,
          grossAmount: 11.9,
          currency: 'EUR',
          accountingCategory: 'travel',
          businessPurpose: 'Client visit',
        },
      },
    );

    expect(recheckResponse.body.draftEligibility.eligible).toBe(true);
    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: 'stale-fingerprint',
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(409);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });

  it('rejects create-draft for invalid VAT math after recheck', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const recheckResponse = await recheckDocument(
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
      },
    );
    expect(recheckResponse.status).toBe(200);
    expect(recheckResponse.body.decisionFingerprint).toEqual(expect.any(String));

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(409);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });

  it('rejects create-draft for unsupported reviewed document type', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const recheckResponse = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: {
          documentType: 'contract',
          vendorName: 'Contract Vendor',
          documentDate: '2026-06-18',
          grossAmount: 119,
          currency: 'EUR',
        },
      },
    );
    expect(recheckResponse.status).toBe(200);
    expect(recheckResponse.body.decisionFingerprint).toEqual(expect.any(String));

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(422);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });


  it('creates an expense draft after valid manual override using restricted VAT values only', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );

    const recheckResponse = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: {
          documentType: 'receipt',
          businessDirection: 'incoming',
          vendorName: 'Taxi Berlin GmbH',
          documentDate: '2026-06-18',
          netAmount: 100,
          vatRate: 0.19,
          vatAmount: 19,
          grossAmount: 119,
          currency: 'EUR',
          accountingCategory: 'travel',
          businessPurpose: 'Client meeting travel',
        },
        changeReason: 'Reviewed incomplete receipt with restricted tax treatment',
        manualOverride: {
          shortDescription: 'Taxi ride to client meeting',
          reason: 'Receipt is partially incomplete but documents a business expense',
          riskLevel: 'medium',
          restrictedTaxTreatmentAcknowledged: true,
        },
      },
    );

    expect(recheckResponse.status).toBe(200);
    expect(recheckResponse.body.editablePayload.reviewedValues).toEqual(
      expect.objectContaining({
        vatRate: 0,
        vatAmount: 0,
        taxTreatment: 'no_vorsteuer_allowed',
        inputVatAllowed: false,
        accountantReviewRequired: true,
      }),
    );

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create restricted expense draft from manual override',
      },
    );

    expect(response.status).toBe(201);
    expect(response.body.draft).toEqual(
      expect.objectContaining({
        type: 'expense',
        status: 'pending',
        summary: 'Taxi Berlin GmbH',
      }),
    );

    const expense = await Expense.findOne({ where: { companyId: accountant.user.companyId } });
    expect(expense).toEqual(
      expect.objectContaining({
        vendorName: 'Taxi Berlin GmbH',
        category: 'travel',
        source: 'ai_document_intake_reviewed',
      }),
    );
    expect(Number(expense.netAmount)).toBe(119);
    expect(Number(expense.vatRate)).toBe(0);
    expect(Number(expense.vatAmount)).toBe(0);
    expect(Number(expense.grossAmount)).toBe(119);
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);

    const auditLog = await AuditLog.findOne({
      where: { action: 'DOCUMENT_DRAFT_CREATED_FROM_REVIEWED_VALUES' },
      order: [['createdAt', 'DESC']],
    });
    expect(auditLog?.newValues).toEqual(
      expect.objectContaining({
        manualOverride: expect.objectContaining({
          riskLevel: 'medium',
          restrictedTaxTreatmentAcknowledged: true,
        }),
        restrictedTaxTreatment: expect.objectContaining({
          taxTreatment: 'no_vorsteuer_allowed',
          inputVatAllowed: false,
          accountantReviewRequired: true,
        }),
      }),
    );
  });

  it('rejects manual override create-draft when restricted VAT values were tampered with', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );

    const recheckResponse = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: {
          documentType: 'receipt',
          businessDirection: 'incoming',
          vendorName: 'Taxi Berlin GmbH',
          documentDate: '2026-06-18',
          netAmount: 100,
          vatRate: 0.19,
          vatAmount: 19,
          grossAmount: 119,
          currency: 'EUR',
          accountingCategory: 'travel',
          businessPurpose: 'Client meeting travel',
        },
        manualOverride: {
          shortDescription: 'Taxi ride to client meeting',
          reason: 'Receipt is partially incomplete but documents a business expense',
          riskLevel: 'medium',
          restrictedTaxTreatmentAcknowledged: true,
        },
      },
    );

    const document = await FileAttachment.findByPk(analyzeResponse.body.document.id);
    const tamperedData = JSON.parse(JSON.stringify(document.extractedData));
    tamperedData.intake.editablePayload.reviewedValues.vatAmount = 19;
    tamperedData.intake.editablePayload.reviewedValues.vatRate = 0.19;
    await document.update({ extractedData: tamperedData });
    await document.reload();
    expect(Number(document.extractedData.intake.editablePayload.reviewedValues.vatAmount)).toBe(19);
    expect(Number(document.extractedData.intake.editablePayload.reviewedValues.vatRate)).toBe(0.19);

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Attempt tampered manual override draft',
      },
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/restricted VAT treatment/i);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
  });

  it('creates an expense draft from reviewed receipt values only and links the source document', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const reviewedValues = {
      documentType: 'receipt',
      businessDirection: 'incoming',
      vendorName: 'Reviewed Vendor GmbH',
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
    const recheckResponse = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues,
        changeReason: 'Corrected OCR fields before draft',
      },
    );

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(201);
    expect(response.body.draft).toEqual(
      expect.objectContaining({
        type: 'expense',
        status: 'pending',
        summary: 'Reviewed Vendor GmbH',
      }),
    );
    const expense = await Expense.findOne({ where: { companyId: accountant.user.companyId } });
    expect(expense).toEqual(
      expect.objectContaining({
        vendorName: 'Reviewed Vendor GmbH',
        category: 'travel',
        source: 'ai_document_intake_reviewed',
      }),
    );
    expect(Number(expense.netAmount)).toBe(10);
    expect(Number(expense.vatAmount)).toBe(1.9);
    expect(Number(expense.grossAmount)).toBe(11.9);
    expect(await Invoice.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    const sourceDocument = await FileAttachment.findByPk(analyzeResponse.body.document.id);
    const sourceData = sourceDocument.extractedData || {};
    expect(
      String(sourceDocument.expenseId || '') === String(expense.id) ||
        String(sourceData.linkedExpenseId || '') === String(expense.id) ||
        sourceDocument.attachedToType === 'Expense',
    ).toBe(true);
    const auditLog = await AuditLog.findOne({
      where: { action: 'DOCUMENT_DRAFT_CREATED_FROM_REVIEWED_VALUES' },
      order: [['createdAt', 'DESC']],
    });
    expect(auditLog?.newValues).toEqual(
      expect.objectContaining({
        documentId: analyzeResponse.body.document.id,
        source: 'ai_document_intake_reviewed',
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        fieldChanges: expect.any(Array),
      }),
    );
  });

  it('creates an invoice draft from reviewed customer invoice values only', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const reviewedValues = {
      documentType: 'customer_invoice',
      businessDirection: 'outgoing',
      customerName: 'Reviewed Customer GmbH',
      documentNumber: 'INV-REVIEW-1',
      documentDate: '2026-06-18',
      dueDate: '2026-07-02',
      netAmount: 100,
      vatRate: 0.19,
      vatAmount: 19,
      grossAmount: 119,
      currency: 'EUR',
      accountingCategory: 'consulting',
      businessPurpose: 'Reviewed consulting services',
    };
    const recheckResponse = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      { reviewedValues },
    );

    const response = await createDraftFromReviewedDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(201);
    expect(response.body.draft).toEqual(
      expect.objectContaining({
        type: 'invoice',
        status: 'DRAFT',
        summary: 'Reviewed Customer GmbH',
      }),
    );
    const invoice = await Invoice.findOne({ where: { companyId: accountant.user.companyId } });
    expect(invoice.clientName).toBe('Reviewed Customer GmbH');
    expect(invoice.status).toBe('DRAFT');
    expect(Number(invoice.subtotal)).toBe(100);
    expect(Number(invoice.total)).toBe(119);
    expect(await Expense.count({ where: { companyId: accountant.user.companyId } })).toBe(0);
    const sourceDocument = await FileAttachment.findByPk(analyzeResponse.body.document.id);
    expect(sourceDocument.invoiceId).toBe(invoice.id);
  });

  it('keeps create-draft scoped to the active company', async () => {
    await mockReceiptOcr({ user: admin.user, companyId: admin.user.companyId });
    const analyzeResponse = await uploadFile(admin.token, admin.user.companyId, fixturePath);
    const recheckResponse = await recheckDocument(admin.token, admin.user.companyId, analyzeResponse.body.document.id, {
      reviewedValues: {
        documentType: 'receipt',
        vendorName: 'Reviewed Vendor GmbH',
        documentDate: '2026-06-18',
        netAmount: 10,
        vatRate: 0.19,
        vatAmount: 1.9,
        grossAmount: 11.9,
        currency: 'EUR',
        accountingCategory: 'travel',
        businessPurpose: 'Client visit',
      },
    });

    const response = await createDraftFromReviewedDocument(
      otherAdmin.token,
      otherAdmin.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(response.status).toBe(404);
  });

  it('blocks viewer and auditor roles from creating reviewed drafts', async () => {
    await mockReceiptOcr({ user: accountant.user, companyId: accountant.user.companyId });
    const analyzeResponse = await uploadFile(
      accountant.token,
      accountant.user.companyId,
      fixturePath,
    );
    const recheckResponse = await recheckDocument(
      accountant.token,
      accountant.user.companyId,
      analyzeResponse.body.document.id,
      {
        reviewedValues: {
          documentType: 'receipt',
          vendorName: 'Reviewed Vendor GmbH',
          documentDate: '2026-06-18',
          netAmount: 10,
          vatRate: 0.19,
          vatAmount: 1.9,
          grossAmount: 11.9,
          currency: 'EUR',
          accountingCategory: 'travel',
          businessPurpose: 'Client visit',
        },
      },
    );

    const viewerResponse = await createDraftFromReviewedDocument(
      viewer.token,
      viewer.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create draft from reviewed document values',
      },
    );
    const auditorResponse = await createDraftFromReviewedDocument(
      auditor.token,
      auditor.user.companyId,
      analyzeResponse.body.document.id,
      {
        decisionFingerprint: recheckResponse.body.decisionFingerprint,
        reason: 'Create draft from reviewed document values',
      },
    );

    expect(viewerResponse.status).toBe(403);
    expect(auditorResponse.status).toBe(403);
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
