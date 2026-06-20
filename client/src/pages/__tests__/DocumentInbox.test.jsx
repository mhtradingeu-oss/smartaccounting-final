import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DocumentInbox from '../DocumentInbox';
import { listDocumentInbox } from '../../services/ocrAPI';

vi.mock('../../services/ocrAPI', () => ({
  listDocumentInbox: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  formatApiError: (_error, fallback) => fallback,
}));

vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { id: 1, name: 'Demo Company' },
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <DocumentInbox />
    </MemoryRouter>,
  );

const inboxPayload = {
  success: true,
  count: 2,
  documents: [
    {
      id: 'doc-1',
      originalName: 'receipt.pdf',
      documentType: 'receipt',
      processingStatus: 'ready_for_review',
      uploadedAt: '2026-06-20T10:00:00.000Z',
      reviewState: { status: 'rechecked' },
      draftEligibility: { eligible: true },
      accountingDecision: {
        postingIntent: 'expense_draft',
        draftType: 'expense',
        vatTreatment: 'domestic_input_vat_review_required',
      },
      vatTreatment: 'domestic_input_vat_review_required',
      inputVatAllowed: true,
      accountantReviewRequired: false,
      draftCreation: {
        draftType: 'expense',
        draftId: 44,
      },
    },
    {
      id: 'doc-2',
      originalName: 'taxi.png',
      documentType: 'receipt',
      processingStatus: 'needs_review',
      uploadedAt: '2026-06-20T11:00:00.000Z',
      reviewState: { status: 'needs_review' },
      draftEligibility: { eligible: false },
      accountingDecision: {
        postingIntent: 'expense_draft',
        draftType: 'expense',
        vatTreatment: 'no_vorsteuer_allowed',
      },
      vatTreatment: 'no_vorsteuer_allowed',
      inputVatAllowed: false,
      accountantReviewRequired: true,
      manualOverride: { riskLevel: 'medium' },
    },
  ],
};

describe('DocumentInbox page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders document inbox rows and safety indicators', async () => {
    listDocumentInbox.mockResolvedValueOnce(inboxPayload);

    renderPage();

    expect(await screen.findByText('Document Inbox')).toBeInTheDocument();
    expect(await screen.findByText('receipt.pdf')).toBeInTheDocument();
    expect(screen.getByText('taxi.png')).toBeInTheDocument();
    expect(screen.getAllByText('Manual override').length).toBeGreaterThan(0);
    expect(screen.getByText('No input VAT')).toBeInTheDocument();
    expect(screen.getByText('Human review remains required')).toBeInTheDocument();

    await waitFor(() =>
      expect(listDocumentInbox).toHaveBeenCalledWith({
        limit: 100,
      }),
    );
  });

  it('reloads documents when a filter is selected', async () => {
    listDocumentInbox
      .mockResolvedValueOnce(inboxPayload)
      .mockResolvedValueOnce({ success: true, count: 1, documents: [inboxPayload.documents[1]] });

    renderPage();

    await screen.findByText('receipt.pdf');
    fireEvent.click(screen.getByRole('button', { name: /Manual override/i }));

    await waitFor(() =>
      expect(listDocumentInbox).toHaveBeenLastCalledWith({
        manualOverride: 'true',
        limit: 100,
      }),
    );
  });

  it('shows empty state when no documents are returned', async () => {
    listDocumentInbox.mockResolvedValueOnce({ success: true, count: 0, documents: [] });

    renderPage();

    expect(await screen.findByText('No documents found')).toBeInTheDocument();
    expect(screen.getByText(/Upload and analyze a document/i)).toBeInTheDocument();
  });

  it('shows an error state when the inbox cannot be loaded', async () => {
    listDocumentInbox.mockRejectedValueOnce(new Error('network'));

    renderPage();

    expect(await screen.findByText('Document inbox unavailable')).toBeInTheDocument();
    expect(screen.getByText('Unable to load document inbox.')).toBeInTheDocument();
  });
});
