import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TaxBridge from '../TaxBridge';
import { getTaxBridgeReadiness } from '../../services/taxBridgeAPI';

vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { id: 7, name: 'Northwind GmbH' },
  }),
}));

vi.mock('../../services/taxBridgeAPI', () => ({
  getTaxBridgeReadiness: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  formatApiError: (_error, fallback) => fallback,
}));

const readinessPayload = {
  success: true,
  product: 'SmartAccounting Tax Bridge',
  mode: 'preparation_only',
  period: {
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-12-31T00:00:00.000Z',
  },
  scores: {
    overall: 80,
    datevReadiness: 82,
    elsterPreparationReadiness: 100,
    gobdEvidenceReadiness: 80,
  },
  metrics: {
    totalInvoices: 12,
    finalizedInvoices: 9,
    draftInvoices: 2,
    totalExpenses: 12,
    postedJournalEntries: 13,
    draftJournalEntries: 0,
    taxAccounts: 2,
    datevExports: 0,
    taxReports: 2,
    invoiceAttachments: 4,
    expenseAttachments: 0,
  },
  issues: [],
  warnings: [
    {
      severity: 'warning',
      code: 'DRAFT_INVOICES_EXIST',
      message: 'Draft invoices exist and will not be included in DATEV export preparation.',
      action: 'Review, finalize, or exclude draft invoices before export.',
    },
  ],
  nextActions: ['Generate a DATEV-compatible export package after resolving critical issues.'],
  sourceBoundaries: [
    'Read-only readiness check.',
    'No DATEV API upload is performed.',
    'No ELSTER submission is performed.',
    'Tax filing and payment decisions must be reviewed by the user and/or qualified Steuerberater.',
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <TaxBridge />
    </MemoryRouter>,
  );

describe('TaxBridge page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTaxBridgeReadiness.mockResolvedValue(readinessPayload);
  });

  it('renders the Tax Bridge package builder with preparation-only boundaries', async () => {
    renderPage();

    expect(screen.getByText('Loading Tax Bridge readiness...')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText('SmartAccounting Tax Bridge')).toBeInTheDocument(),
    );

    expect(getTaxBridgeReadiness).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 7 }),
      expect.any(Object),
    );

    expect(screen.getByText('Package Builder')).toBeInTheDocument();
    expect(screen.getByText('Prepare Steuerberater package')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download readiness JSON/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy package summary/i })).toBeInTheDocument();

    expect(screen.getByText('Readiness JSON report')).toBeInTheDocument();
    expect(screen.getByText('DATEV-compatible export')).toBeInTheDocument();
    expect(screen.getByText('VAT summary / UStVA preparation data')).toBeInTheDocument();
    expect(screen.getByText('Source document evidence')).toBeInTheDocument();
    expect(screen.getByText('Warnings checklist')).toBeInTheDocument();

    expect(screen.getByText('No DATEV API upload is performed.')).toBeInTheDocument();
    expect(screen.getByText('No ELSTER submission is performed.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tax filing and payment decisions must be reviewed by the user and/or qualified Steuerberater.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Open DATEV export/i })).toHaveAttribute(
      'href',
      '/exports/datev',
    );
    expect(screen.getByRole('link', { name: /Open reports/i })).toHaveAttribute(
      'href',
      '/reports',
    );
  });

  it('does not render unsafe filing or submission wording', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('SmartAccounting Tax Bridge')).toBeInTheDocument(),
    );

    const unsafePatterns = [
      /^Submit to ELSTER$/i,
      /^Send to Finanzamt$/i,
      /officially filed/i,
      /tax filing completed/i,
      /DATEV certified/i,
      /ELSTER connected/i,
    ];

    unsafePatterns.forEach((pattern) => {
      expect(screen.queryByText(pattern)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: pattern })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: pattern })).not.toBeInTheDocument();
    });

    expect(screen.getAllByText(/No DATEV upload/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No ELSTER submission/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No tax filing/i).length).toBeGreaterThan(0);
  });
});
