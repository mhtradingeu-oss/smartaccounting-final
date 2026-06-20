import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import AIAssistant from '../AIAssistant';
import CompanyContext from '../../context/CompanyContext';
import { aiAssistantAPI } from '../../services/aiAssistantAPI';
import { analyzeIntake, recheckIntakeDocument } from '../../services/ocrAPI';
import { expensesAPI } from '../../services/expensesAPI';
import { invoicesAPI } from '../../services/invoicesAPI';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      role: 'admin',
      companyId: 1,
    },
  }),
}));

vi.mock('../../services/aiAssistantAPI', () => ({
  aiAssistantAPI: {
    startSession: vi.fn(),
    getContext: vi.fn(),
    askIntent: vi.fn(),
    askIntentStream: vi.fn(),
    askVoice: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../../services/ocrAPI', () => ({
  analyzeIntake: vi.fn(),
  recheckIntakeDocument: vi.fn(),
}));

vi.mock('../../services/expensesAPI', () => ({
  expensesAPI: {
    create: vi.fn(),
  },
}));

vi.mock('../../services/invoicesAPI', () => ({
  invoicesAPI: {
    create: vi.fn(),
  },
}));

vi.mock('../../lib/featureFlags', () => ({
  isAIAssistantEnabled: () => true,
  isAIVoiceEnabled: () => false,
}));

const TestCompanyProvider = ({ children, initialCompany }) => {
  const [activeCompany, setActiveCompany] = useState(initialCompany);
  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        activeCompanyId: activeCompany?.id ?? null,
        companies: [activeCompany],
        setCompanies: () => {},
        switchCompany: setActiveCompany,
        companiesError: null,
        setCompaniesError: () => {},
        reloadCompanies: () => {},
        reloadToken: 0,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

const contextPayload = {
  company: { id: 1, name: 'TraceCo', city: 'Berlin', country: 'DE', aiEnabled: true },
  invoices: [],
  expenses: [],
  bankTransactions: [],
  insights: [],
};

const renderAssistant = async () => {
  window.fetch = vi.fn();
  window.ReadableStream = undefined;
  delete window.MediaRecorder;
  aiAssistantAPI.startSession.mockResolvedValueOnce({ sessionId: 'session-test' });
  aiAssistantAPI.getContext.mockResolvedValueOnce(contextPayload);

  render(
    <MemoryRouter>
      <TestCompanyProvider initialCompany={{ id: 1, name: 'TraceCo' }}>
        <AIAssistant />
      </TestCompanyProvider>
    </MemoryRouter>,
  );

  await waitFor(() => expect(screen.getByText('AI Accounting Assistant')).toBeInTheDocument());
};

describe('AI Assistant ChatGPT-like experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('answers greeting locally and does not call review intent', async () => {
    await renderAssistant();

    fireEvent.change(screen.getByLabelText('Type your question'), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => expect(screen.getAllByText(/كيف أقدر أساعدك اليوم/i).length).toBeGreaterThan(1));
    expect(aiAssistantAPI.askIntent).not.toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'review' }),
    );
    expect(aiAssistantAPI.askIntent).not.toHaveBeenCalled();
  });

  it('answers Arabic greeting locally', async () => {
    await renderAssistant();

    fireEvent.change(screen.getByLabelText('Type your question'), { target: { value: 'مرحبا' } });
    fireEvent.keyDown(screen.getByLabelText('Type your question'), {
      key: 'Enter',
      code: 'Enter',
      shiftKey: false,
    });

    await waitFor(() =>
      expect(screen.getAllByText(/مرحبًا، كيف أقدر أساعدك اليوم/i).length).toBeGreaterThan(1),
    );
    expect(aiAssistantAPI.askIntent).not.toHaveBeenCalled();
  });

  it('review quick action calls review intent', async () => {
    aiAssistantAPI.askIntent.mockResolvedValueOnce({
      answer: { message: 'Review response', highlights: [], references: [] },
      requestId: 'req-review',
    });
    await renderAssistant();

    fireEvent.click(screen.getByRole('button', { name: /What needs my attention/i }));

    await waitFor(() =>
      expect(aiAssistantAPI.askIntent).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'review' }),
      ),
    );
    expect(await screen.findByText('Review response')).toBeInTheDocument();
  });

  it('risk quick action calls risks intent', async () => {
    aiAssistantAPI.askIntent.mockResolvedValueOnce({
      answer: { message: 'Risk response', highlights: [], references: [] },
      requestId: 'req-risks',
    });
    await renderAssistant();

    fireEvent.click(screen.getByRole('button', { name: /Show me key risks/i }));

    await waitFor(() =>
      expect(aiAssistantAPI.askIntent).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'risks' }),
      ),
    );
  });

  it('composer supports typing and sending', async () => {
    aiAssistantAPI.askIntent.mockResolvedValueOnce({
      answer: { message: 'Transaction explanation', highlights: [], references: [] },
      requestId: 'req-tx',
    });
    await renderAssistant();

    fireEvent.change(screen.getByLabelText('Type your question'), {
      target: { value: 'Explain this bank transaction' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText('Explain this bank transaction')).toBeInTheDocument();
    await waitFor(() =>
      expect(aiAssistantAPI.askIntent).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'explain_transaction' }),
      ),
    );
  });

  it('attachment button allows adding and removing a file chip', async () => {
    await renderAssistant();

    const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Choose file attachment'), {
      target: { files: [file] },
    });

    expect(await screen.findByText(/invoice\.pdf/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Remove invoice\.pdf/i }));
    expect(screen.queryByText(/invoice\.pdf/i)).not.toBeInTheDocument();
  });

  it('uploads attached document to OCR intake and renders analysis card', async () => {
    analyzeIntake.mockResolvedValueOnce({
      success: true,
      requestId: 'req-doc',
      document: { id: 'doc-1', originalName: 'receipt.pdf' },
      ocr: { confidence: 88 },
      classification: {
        documentType: 'receipt',
        suggestedAction: 'create_expense_draft',
        confidence: 'medium',
      },
      extracted: {
        vendorName: 'DB Vertrieb GmbH',
        grossAmount: 11.9,
        currency: 'EUR',
      },
      validation: {
        status: 'needs_review',
        errors: [],
        warnings: ['Business purpose is required before using this as an expense draft.'],
        missingFields: ['businessPurpose'],
      },
      reviewState: {
        status: 'needs_review',
        reviewRequired: true,
        reviewedByUserId: null,
        reviewedAt: null,
        hasUserCorrections: false,
        criticalFieldsReviewed: false,
      },
      editablePayload: {
        aiExtractedValues: {
          vendorName: 'DB Vertrieb GmbH',
          grossAmount: 11.9,
          currency: 'EUR',
        },
        reviewedValues: null,
        fieldChanges: [],
      },
      draftEligibility: {
        eligible: false,
        reason: 'Review extracted fields and re-check document before draft creation.',
      },
      draft: { targetRoute: 'POST /api/expenses', payload: { attachments: ['doc-1'] } },
      audit: {
        advisoryOnly: true,
        requiresHumanConfirmation: true,
        blockedActions: ['post', 'approve', 'delete', 'reconcile'],
      },
    });
    await renderAssistant();

    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Choose file attachment'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() =>
      expect(analyzeIntake).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ companyId: 1, documentType: 'auto' }),
      ),
    );
    expect(await screen.findByText('Document analysis')).toBeInTheDocument();
    expect(screen.getByText(/receipt · create_expense_draft/i)).toBeInTheDocument();
    expect(screen.getByText('vendorName')).toBeInTheDocument();
    expect(screen.getByText('DB Vertrieb GmbH')).toBeInTheDocument();
    expect(screen.getByText('Review extracted fields required')).toBeInTheDocument();
    expect(screen.getByText(/Status: needs_review/i)).toBeInTheDocument();
    expect(screen.getByText(/Review extracted fields and re-check document/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept for draft/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review extracted fields/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Confirm create expense draft/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm create invoice draft/i })).not.toBeInTheDocument();
  });

  it('reviews edited fields and rechecks the document without creating a draft', async () => {
    analyzeIntake.mockResolvedValueOnce({
      requestId: 'req-doc',
      document: { id: 'doc-1', originalName: 'receipt.pdf' },
      classification: {
        documentType: 'receipt',
        suggestedAction: 'create_expense_draft',
        category: 'travel',
        confidence: 'medium',
      },
      extracted: {
        vendorName: 'DB Vertrieb GmbH',
        documentDate: '2026-06-18',
        netAmount: 10,
        vatRate: 0.19,
        vatAmount: 1.9,
        grossAmount: 11.9,
        currency: 'USD',
      },
      validation: {
        status: 'needs_review',
        errors: [],
        warnings: [],
        missingFields: [],
      },
      reviewState: {
        status: 'needs_review',
        reviewRequired: true,
        reviewedByUserId: null,
        reviewedAt: null,
        hasUserCorrections: false,
        criticalFieldsReviewed: false,
      },
      editablePayload: {
        aiExtractedValues: {
          documentType: 'receipt',
          vendorName: 'DB Vertrieb GmbH',
          documentDate: '2026-06-18',
          netAmount: 10,
          vatRate: 0.19,
          vatAmount: 1.9,
          grossAmount: 11.9,
          currency: 'USD',
          accountingCategory: 'travel',
        },
        reviewedValues: null,
        fieldChanges: [],
      },
      draftEligibility: {
        eligible: false,
        reason: 'Review extracted fields and re-check document before draft creation.',
      },
      draft: {
        targetRoute: 'POST /api/expenses',
        payload: {
          reason: 'User must confirm AI document intake suggestion',
          systemContext: { source: 'ai_document_intake', documentId: 'doc-1' },
        },
      },
      audit: {
        advisoryOnly: true,
        requiresHumanConfirmation: true,
        blockedActions: ['post', 'approve', 'delete', 'reconcile'],
      },
    });
    recheckIntakeDocument.mockResolvedValueOnce({
      requestId: 'req-recheck',
      document: { id: 'doc-1', originalName: 'receipt.pdf' },
      classification: {
        documentType: 'receipt',
        suggestedAction: 'create_expense_draft',
        category: 'software',
        confidence: 'medium',
      },
      extracted: {
        vendorName: 'DB Fernverkehr AG',
        documentDate: '2026-06-19',
        netAmount: 20,
        vatRate: 0.07,
        vatAmount: 1.4,
        grossAmount: 21.4,
        currency: 'EUR',
        accountingCategory: 'software',
      },
      validation: {
        status: 'needs_review',
        errors: [],
        warnings: [],
        missingFields: [],
      },
      reviewState: {
        status: 'rechecked',
        reviewRequired: true,
        reviewedByUserId: 1,
        reviewedAt: '2026-06-20T10:00:00.000Z',
        hasUserCorrections: true,
        criticalFieldsReviewed: true,
      },
      editablePayload: {
        aiExtractedValues: {
          documentType: 'receipt',
          vendorName: 'DB Vertrieb GmbH',
          documentDate: '2026-06-18',
          netAmount: 10,
          vatRate: 0.19,
          vatAmount: 1.9,
          grossAmount: 11.9,
          currency: 'USD',
          accountingCategory: 'travel',
        },
        reviewedValues: {
          documentType: 'receipt',
          vendorName: 'DB Fernverkehr AG',
          documentDate: '2026-06-19',
          netAmount: '20',
          vatRate: '0.07',
          vatAmount: '1.40',
          grossAmount: '21.40',
          currency: 'EUR',
          accountingCategory: 'software',
        },
        fieldChanges: [
          {
            field: 'vendorName',
            aiValue: 'DB Vertrieb GmbH',
            correctedValue: 'DB Fernverkehr AG',
            userId: 1,
            timestamp: '2026-06-20T10:00:00.000Z',
            reason: 'Corrected OCR fields before draft',
          },
          {
            field: 'accountingCategory',
            aiValue: 'travel',
            correctedValue: 'software',
            userId: 1,
            timestamp: '2026-06-20T10:00:00.000Z',
            reason: 'Corrected OCR fields before draft',
          },
        ],
      },
      draftEligibility: {
        eligible: false,
        reason: 'Review extracted fields and re-check document before draft creation.',
      },
      draft: { targetRoute: 'POST /api/expenses', payload: { attachments: ['doc-1'] } },
      audit: {
        advisoryOnly: true,
        requiresHumanConfirmation: true,
        blockedActions: ['post', 'approve', 'delete', 'reconcile'],
      },
    });

    await renderAssistant();

    const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Choose file attachment'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Review extracted fields/i }));

    fireEvent.change(screen.getByLabelText('vendorName'), {
      target: { value: 'DB Fernverkehr AG' },
    });
    fireEvent.change(screen.getByLabelText('documentDate'), {
      target: { value: '2026-06-19' },
    });
    fireEvent.change(screen.getByLabelText('vatRate'), {
      target: { value: '0.07' },
    });
    fireEvent.change(screen.getByLabelText('vatAmount'), {
      target: { value: '1.40' },
    });
    fireEvent.change(screen.getByLabelText('grossAmount'), {
      target: { value: '21.40' },
    });
    fireEvent.change(screen.getByLabelText('currency'), {
      target: { value: 'EUR' },
    });
    fireEvent.change(screen.getByLabelText('accountingCategory'), {
      target: { value: 'software' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Re-check document/i }));

    await waitFor(() =>
      expect(recheckIntakeDocument).toHaveBeenCalledWith(
        'doc-1',
        expect.objectContaining({
          reviewedValues: expect.objectContaining({
            vendorName: 'DB Fernverkehr AG',
            documentDate: '2026-06-19',
            vatRate: '0.07',
            vatAmount: '1.40',
            grossAmount: '21.40',
            currency: 'EUR',
            accountingCategory: 'software',
          }),
          changeReason: 'Corrected OCR fields before draft',
          manualOverride: null,
        }),
        { companyId: 1 },
      ),
    );
    expect(await screen.findByText(/Status: rechecked/i)).toBeInTheDocument();
    expect(screen.getByText('Field changes')).toBeInTheDocument();
    expect(screen.getAllByText('AI extracted value:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reviewed value:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DB Fernverkehr AG').length).toBeGreaterThan(0);
    expect(screen.getByText('Recheck complete')).toBeInTheDocument();
    expect(expensesAPI.create).not.toHaveBeenCalled();
    expect(invoicesAPI.create).not.toHaveBeenCalled();
  });

  it('does not create an invoice draft directly from raw document analysis', async () => {
    analyzeIntake.mockResolvedValueOnce({
      requestId: 'req-invoice-doc',
      document: { id: 'doc-invoice-1', originalName: 'invoice.pdf' },
      classification: {
        documentType: 'invoice',
        suggestedAction: 'create_invoice_draft',
        category: 'services',
        confidence: 'high',
      },
      extracted: {
        customerName: 'ACME GmbH',
        documentDate: '2026-06-18',
        dueDate: '2026-07-02',
        documentNumber: 'INV-9',
        netAmount: 100,
        vatRate: 0.19,
        currency: 'EUR',
      },
      validation: {
        status: 'ready_for_review',
        errors: [],
        warnings: [],
        missingFields: [],
      },
      reviewState: {
        status: 'needs_review',
        reviewRequired: true,
        reviewedByUserId: null,
        reviewedAt: null,
        hasUserCorrections: false,
        criticalFieldsReviewed: false,
      },
      editablePayload: {
        aiExtractedValues: {
          customerName: 'ACME GmbH',
          documentDate: '2026-06-18',
          dueDate: '2026-07-02',
          documentNumber: 'INV-9',
          netAmount: 100,
          vatRate: 0.19,
          currency: 'EUR',
        },
        reviewedValues: null,
        fieldChanges: [],
      },
      draftEligibility: {
        eligible: false,
        reason: 'Review extracted fields and re-check document before draft creation.',
      },
      draft: {
        targetRoute: 'POST /api/invoices',
        payload: {
          reason: 'User must confirm AI document intake suggestion',
          systemContext: { source: 'ai_document_intake', documentId: 'doc-invoice-1' },
        },
      },
      audit: {
        advisoryOnly: true,
        requiresHumanConfirmation: true,
        blockedActions: ['post', 'approve', 'delete', 'reconcile'],
      },
    });

    await renderAssistant();

    const file = new File(['%PDF-1.4'], 'invoice.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Choose file attachment'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('button', { name: /Review extracted fields/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm create invoice draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm create expense draft/i })).not.toBeInTheDocument();
    expect(recheckIntakeDocument).not.toHaveBeenCalled();
    expect(invoicesAPI.create).not.toHaveBeenCalled();
    expect(expensesAPI.create).not.toHaveBeenCalled();
  });

  it('camera input exists with image accept', async () => {
    await renderAssistant();

    const cameraInput = screen.getByLabelText('Capture image attachment');
    expect(cameraInput).toHaveAttribute('accept', 'image/*');
    expect(cameraInput).toHaveAttribute('capture', 'environment');
  });

  it('microphone button renders and handles unsupported MediaRecorder gracefully', async () => {
    await renderAssistant();

    fireEvent.click(screen.getByRole('button', { name: /Start voice recording/i }));

    expect(
      await screen.findByText(/Voice recording is not available in this browser/i),
    ).toBeInTheDocument();
  });

  it('assistant answer renders bullets and references clearly', async () => {
    aiAssistantAPI.askIntent.mockResolvedValueOnce({
      answer: {
        message: 'Here is the review.',
        highlights: ['Overdue invoice found'],
        requiredActions: ['Check payment status'],
        references: ['Invoice INV-1'],
        confidence: 'Medium',
      },
      requestId: 'req-format',
    });
    await renderAssistant();

    fireEvent.click(screen.getByRole('button', { name: /What needs my attention/i }));

    expect(await screen.findByText('Here is the review.')).toBeInTheDocument();
    expect(screen.getByText('Highlights')).toBeInTheDocument();
    expect(screen.getByText('Overdue invoice found')).toBeInTheDocument();
    expect(screen.getByText('Suggested next steps')).toBeInTheDocument();
    expect(screen.getByText('Check payment status')).toBeInTheDocument();
    expect(screen.getByText('References')).toBeInTheDocument();
    expect(screen.getByText('Invoice INV-1')).toBeInTheDocument();
  });

  it('renders requestId when present on assistant responses', async () => {
    aiAssistantAPI.askIntent.mockResolvedValueOnce({
      answer: { message: 'Traceable response', highlights: [], references: [] },
      requestId: 'req-123',
    });
    await renderAssistant();

    fireEvent.click(screen.getByRole('button', { name: /What needs my attention/i }));
    await waitFor(() => expect(screen.getByText('Traceable response')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Show request IDs/i }));

    expect(screen.getByText(/Request ID: req-123/i)).toBeInTheDocument();
  });

  it('renders partial streamed chunks', async () => {
    window.fetch = vi.fn();
    window.ReadableStream = function ReadableStream() {};
    delete window.MediaRecorder;
    aiAssistantAPI.startSession.mockResolvedValueOnce({ sessionId: 'session-test' });
    aiAssistantAPI.getContext.mockResolvedValueOnce(contextPayload);
    aiAssistantAPI.askIntentStream.mockImplementation(async ({ onEvent }) => {
      onEvent({ event: 'chunk', data: { token: 'Hallo ', requestId: 'req-stream' } });
      onEvent({ event: 'chunk', data: { token: 'Welt', requestId: 'req-stream' } });
      onEvent({ event: 'done', data: { requestId: 'req-stream' } });
    });

    render(
      <MemoryRouter>
        <TestCompanyProvider initialCompany={{ id: 1, name: 'TraceCo' }}>
          <AIAssistant />
        </TestCompanyProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('AI Accounting Assistant')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /What needs my attention/i }));

    await waitFor(() => expect(screen.getByText('Hallo Welt')).toBeInTheDocument());
    expect(aiAssistantAPI.askIntent).not.toHaveBeenCalled();
  });

  it('does not render dangerous write-action buttons', async () => {
    await renderAssistant();

    const chat = screen.getByText('Assistant chat').closest('div');
    expect(within(chat).queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(within(chat).queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument();
    expect(within(chat).queryByRole('button', { name: /^resolve$/i })).not.toBeInTheDocument();
    expect(within(chat).queryByRole('button', { name: /^post$/i })).not.toBeInTheDocument();
    expect(within(chat).queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    expect(within(chat).queryByRole('button', { name: /^reconcile$/i })).not.toBeInTheDocument();
  });
});
