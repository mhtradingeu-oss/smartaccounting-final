const documentIntakeAssistantService = require('../../src/services/ai/documentIntakeAssistantService');

describe('documentIntakeAssistantService', () => {
  it('classifies receipt-like OCR text as create_expense_draft', () => {
    const result = documentIntakeAssistantService.analyzeIntake({
      text: 'Quittung DB Vertrieb GmbH 18.06.2026 Gesamt 11,90 EUR MwSt 1,90',
      documentType: 'auto',
      documentId: 'doc-1',
      extractedData: {
        type: 'receipt',
        vendor: 'DB Vertrieb GmbH',
        date: '18.06.2026',
        amount: 11.9,
        vatAmount: 1.9,
      },
    });

    expect(result.classification.documentType).toBe('receipt');
    expect(result.classification.suggestedAction).toBe('create_expense_draft');
    expect(result.draft.targetRoute).toBe('POST /api/expenses');
    expect(result.audit.advisoryOnly).toBe(true);
    expect(result.audit.requiresHumanConfirmation).toBe(true);
    expect(result.reviewState).toEqual({
      status: 'needs_review',
      reviewRequired: true,
      reviewedByUserId: null,
      reviewedAt: null,
      hasUserCorrections: false,
      criticalFieldsReviewed: false,
    });
    expect(result.editablePayload).toEqual(
      expect.objectContaining({
        reviewedValues: null,
        fieldChanges: [],
      }),
    );
    expect(result.editablePayload.aiExtractedValues).toEqual(result.extracted);
    expect(result.draftEligibility).toEqual(
      expect.objectContaining({
        eligible: false,
        reason: expect.stringMatching(/Review extracted fields/i),
      }),
    );
    expect(result.lifecycle).toEqual(
      expect.objectContaining({
        schemaVersion: 'document_lifecycle_decision.v1',
        reviewState: result.reviewState,
        editablePayload: result.editablePayload,
        draftEligibility: result.draftEligibility,
      }),
    );
  });

  it('keeps the AI extracted values as an immutable intake snapshot', () => {
    const result = documentIntakeAssistantService.analyzeIntake({
      text: 'Quittung DB Vertrieb GmbH 18.06.2026 Gesamt 11,90 EUR MwSt 1,90',
      documentType: 'auto',
      documentId: 'doc-1',
      extractedData: {
        type: 'receipt',
        vendor: 'DB Vertrieb GmbH',
        date: '18.06.2026',
        amount: 11.9,
        vatAmount: 1.9,
      },
    });

    result.extracted.vendorName = 'Changed Vendor';
    result.extracted.raw.vendor = 'Changed Raw Vendor';

    expect(result.editablePayload.aiExtractedValues.vendorName).toBe('DB Vertrieb GmbH');
    expect(result.editablePayload.aiExtractedValues.raw.vendor).toBe('DB Vertrieb GmbH');
    expect(result.editablePayload.reviewedValues).toBeNull();
    expect(result.editablePayload.fieldChanges).toEqual([]);
  });

  it('classifies bank statement-like OCR text as bank_statement_dry_run', () => {
    const result = documentIntakeAssistantService.analyzeIntake({
      text: 'Kontoauszug IBAN DE89370400440532013000 Anfangssaldo Endsaldo Zeitraum 01.06.2026 - 30.06.2026',
      documentType: 'auto',
      documentId: 'doc-bank',
      extractedData: {
        type: 'bank_statement',
        accountNumber: 'DE89370400440532013000',
        period: '01.06.2026 - 30.06.2026',
      },
    });

    expect(result.classification.documentType).toBe('bank_statement');
    expect(result.classification.suggestedAction).toBe('bank_statement_dry_run');
    expect(result.draft.targetRoute).toBe('POST /api/bank-statements/import?dryRun=true');
  });

  it('flags implausible VAT math as needs_correction', () => {
    const result = documentIntakeAssistantService.analyzeIntake({
      text: 'Rechnung Supplier GmbH Gesamt 119 EUR Netto 100 EUR MwSt 10 EUR',
      documentType: 'invoice',
      documentId: 'doc-bad',
      extractedData: {
        invoiceNumber: 'R-1',
        vendor: 'Supplier GmbH',
        date: '18.06.2026',
        netAmount: 100,
        vatAmount: 10,
        totalAmount: 119,
        vatRate: 0.19,
      },
    });

    expect(result.classification.suggestedAction).toBe('needs_correction');
    expect(result.validation.errors.join(' ')).toMatch(/Net \+ VAT/i);
  });

  it('applies rechecked review state while preserving the AI extracted snapshot', () => {
    const reviewedValues = {
      documentType: 'receipt',
      vendorName: 'DB Fernverkehr AG',
      documentDate: '2026-06-18',
      netAmount: 10,
      vatRate: 0.19,
      vatAmount: 1.9,
      grossAmount: 11.9,
      currency: 'EUR',
      accountingCategory: 'travel',
    };
    const aiExtractedValues = {
      documentType: 'receipt',
      vendorName: 'DB Vertrieb GmbH',
      grossAmount: 11.9,
      currency: 'EUR',
    };
    const reviewedAt = '2026-06-20T10:00:00.000Z';
    const fieldChanges = documentIntakeAssistantService.compareReviewedFields({
      aiExtractedValues,
      reviewedValues,
      userId: 123,
      timestamp: reviewedAt,
      reason: 'Corrected OCR fields before draft',
    });
    const intake = documentIntakeAssistantService.analyzeIntake({
      text: 'Quittung DB Fernverkehr AG Gesamt 11,90 EUR MwSt 1,90',
      documentType: 'receipt',
      documentId: 'doc-1',
      extractedData: documentIntakeAssistantService.mapReviewedValuesToExtractedData(reviewedValues),
    });

    const result = documentIntakeAssistantService.applyRecheckReviewGate({
      intake,
      aiExtractedValues,
      reviewedValues,
      fieldChanges,
      userId: 123,
      reviewedAt,
    });

    expect(fieldChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vendorName',
          aiValue: 'DB Vertrieb GmbH',
          correctedValue: 'DB Fernverkehr AG',
          userId: 123,
          timestamp: reviewedAt,
          reason: 'Corrected OCR fields before draft',
        }),
      ]),
    );
    expect(result.reviewState).toEqual({
      status: 'rechecked',
      reviewRequired: true,
      reviewedByUserId: 123,
      reviewedAt,
      hasUserCorrections: true,
      criticalFieldsReviewed: true,
    });
    expect(result.editablePayload.aiExtractedValues).toEqual(aiExtractedValues);
    expect(result.editablePayload.reviewedValues).toEqual(reviewedValues);
    expect(result.editablePayload.fieldChanges).toEqual(fieldChanges);
    expect(result.draftEligibility.eligible).toBe(false);
    expect(result.decisionFingerprint).toEqual(expect.any(String));
    expect(result.classification.category).toBe('travel');
  });

  it('builds expense draft payloads from reviewed values only', () => {
    const payload = documentIntakeAssistantService.buildReviewedExpenseDraftPayload({
      documentId: 'doc-reviewed',
      reviewedValues: {
        vendorName: 'Reviewed Vendor GmbH',
        documentDate: '2026-06-18',
        netAmount: '100',
        vatRate: '0.19',
        vatAmount: '19',
        grossAmount: '119',
        currency: 'EUR',
        accountingCategory: 'software',
        businessPurpose: 'Reviewed SaaS subscription',
      },
      systemContext: {
        reason: 'Create draft from reviewed document values',
      },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        vendorName: 'Reviewed Vendor GmbH',
        description: 'Reviewed SaaS subscription',
        category: 'software',
        expenseDate: '2026-06-18',
        netAmount: 100,
        vatRate: 0.19,
        vatAmount: 19,
        grossAmount: 119,
        currency: 'EUR',
        status: 'pending',
        source: 'ai_document_intake_reviewed',
        attachments: ['doc-reviewed'],
      }),
    );
  });

  it('builds invoice draft payloads from reviewed values only', () => {
    const payload = documentIntakeAssistantService.buildReviewedInvoiceDraftPayload({
      documentId: 'doc-reviewed',
      reviewedValues: {
        customerName: 'Reviewed Customer GmbH',
        documentDate: '2026-06-18',
        dueDate: '2026-07-02',
        netAmount: '100',
        vatRate: '0.19',
        currency: 'EUR',
        accountingCategory: 'consulting',
        businessPurpose: 'Reviewed consulting services',
      },
      systemContext: {
        reason: 'Create draft from reviewed document values',
      },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        clientName: 'Reviewed Customer GmbH',
        date: '2026-06-18',
        dueDate: '2026-07-02',
        currency: 'EUR',
        status: 'DRAFT',
        attachments: ['doc-reviewed'],
      }),
    );
    expect(payload.items).toEqual([
      expect.objectContaining({
        description: 'Reviewed consulting services',
        quantity: 1,
        unitPrice: 100,
        vatRate: 0.19,
      }),
    ]);
  });
  it('validates manual override requirements before restricted draft creation', () => {
    expect(
      documentIntakeAssistantService.validateManualOverride({
        shortDescription: '',
        reason: '',
        riskLevel: 'unknown',
        restrictedTaxTreatmentAcknowledged: false,
      }),
    ).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining([
          expect.stringMatching(/shortDescription/i),
          expect.stringMatching(/reason/i),
          expect.stringMatching(/riskLevel/i),
          expect.stringMatching(/acknowledgement/i),
        ]),
      }),
    );

    expect(
      documentIntakeAssistantService.validateManualOverride({
        shortDescription: 'Taxi ride to client meeting',
        reason: 'Receipt is incomplete but documents a business expense',
        riskLevel: 'medium',
        restrictedTaxTreatmentAcknowledged: true,
      }),
    ).toEqual(
      expect.objectContaining({
        valid: true,
        manualOverride: expect.objectContaining({
          shortDescription: 'Taxi ride to client meeting',
          reason: 'Receipt is incomplete but documents a business expense',
          riskLevel: 'medium',
          restrictedTaxTreatmentAcknowledged: true,
        }),
      }),
    );
  });

  it('forces restricted VAT treatment for valid manual override reviewed values', () => {
    const restricted = documentIntakeAssistantService.buildRestrictedManualOverrideReviewedValues({
      reviewedValues: {
        documentType: 'receipt',
        vendorName: 'Taxi Berlin GmbH',
        businessPurpose: 'Client meeting travel',
        netAmount: 100,
        vatRate: 0.19,
        vatAmount: 19,
        grossAmount: 119,
        currency: 'EUR',
        accountingCategory: 'travel',
      },
      manualOverride: {
        shortDescription: 'Taxi ride to client meeting',
        reason: 'Receipt is partially incomplete but documents a business expense',
        riskLevel: 'medium',
        restrictedTaxTreatmentAcknowledged: true,
      },
    });

    expect(restricted).toEqual(
      expect.objectContaining({
        vendorName: 'Taxi Berlin GmbH',
        businessPurpose: 'Client meeting travel',
        netAmount: 119,
        vatRate: 0,
        vatAmount: 0,
        grossAmount: 119,
        taxTreatment: 'no_vorsteuer_allowed',
        inputVatAllowed: false,
        accountantReviewRequired: true,
        manualOverride: expect.objectContaining({
          riskLevel: 'medium',
          restrictedTaxTreatmentAcknowledged: true,
        }),
      }),
    );
  });


});
