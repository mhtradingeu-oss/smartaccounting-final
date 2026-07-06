import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SmartReviewCenter from '../SmartReviewCenter';
import { reviewCenterAPI } from '../../services/reviewCenterAPI';
import { aiApprovalQueueAPI } from '../../services/aiApprovalQueueAPI';

vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { id: 7, name: 'Northwind GmbH' },
  }),
}));

vi.mock('../../services/reviewCenterAPI', () => ({
  reviewCenterAPI: {
    getSummary: vi.fn(),
  },
}));

vi.mock('../../services/aiApprovalQueueAPI', () => ({
  aiApprovalQueueAPI: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/api', () => ({
  formatApiError: (_error, fallback) => fallback,
}));

const summaryPayload = {
  success: true,
  product: 'SmartAccounting Smart Review Center',
  mode: 'read_only_preparation',
  companyId: 7,
  readiness: {
    overall: 80,
    datev: 82,
    tax: 100,
    audit: 80,
    bank: 20,
    documents: 0,
    ai: 70,
  },
  counts: {
    draftInvoices: 2,
    totalExpenses: 12,
    expensesWithoutAttachments: 12,
    bankStatementsNeedingReview: 2,
    unreconciledBankTransactions: 11,
    pendingAIApprovals: 0,
    aiInsights: 5,
  },
  warnings: [
    {
      source: 'tax_bridge',
      severity: 'warning',
      code: 'DRAFT_INVOICES_EXIST',
      message: 'Draft invoices exist and will not be included in DATEV export preparation.',
      action: 'Review, finalize, or exclude draft invoices before export.',
    },
  ],
  nextActions: [
    {
      priority: 'high',
      code: 'ATTACH_EXPENSE_RECEIPTS',
      title: 'Attach missing expense receipts',
      description: '12 expenses do not have attachments yet.',
      target: '/expenses',
    },
    {
      priority: 'medium',
      code: 'REVIEW_BANK_ITEMS',
      title: 'Review bank statements and unreconciled transactions',
      description: '13 bank review items need attention.',
      target: '/bank-statements',
    },
  ],
  sourceBoundaries: [
    'Read-only review center summary.',
    'No accounting posting is performed.',
    'No AI approval decision is performed.',
    'No DATEV upload is performed.',
    'No ELSTER submission is performed.',
    'Tax filing and payment decisions must be reviewed by the user and/or qualified Steuerberater.',
  ],
  sources: {
    taxBridge: true,
    invoices: true,
    expenses: true,
    bankStatements: true,
    aiInsights: true,
    aiApprovalQueue: 'read_only_stub',
  },
};


const approvalQueuePayload = {
  success: true,
  persisted: true,
  items: [
    {
      id: 'aiap_test_1',
      approvalId: 'aiap_test_1',
      status: 'pending',
      toolId: 'create_expense_draft_from_reviewed_document',
      riskLevel: 'draft_write',
      executionMode: 'prepare_draft',
      approvalReason: 'OCR intake returned a draft suggestion that requires reviewed values.',
      actionProposal: {
        label: 'Create expense draft from reviewed document',
        summary: 'Prepare expense draft proposal from OCR intake for reviewed document values.',
        preview: {
          vendorName: 'DB Vertrieb GmbH',
        },
      },
      metadata: {
        documentType: 'receipt',
      },
      createdAt: '2026-07-06T07:37:38.708Z',
    },
  ],
  meta: {
    companyId: 7,
    readOnly: true,
    executionEnabled: false,
    approvalDecisionsEnabled: false,
  },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <SmartReviewCenter />
    </MemoryRouter>,
  );

describe('SmartReviewCenter page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewCenterAPI.getSummary.mockResolvedValue(summaryPayload);
    aiApprovalQueueAPI.list.mockResolvedValue(approvalQueuePayload);
  });

  it('renders read-only smart review summary from the backend', async () => {
    renderPage();

    expect(screen.getByLabelText('Loading Smart Review Center')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Smart Review Center')).toBeInTheDocument());

    expect(reviewCenterAPI.getSummary).toHaveBeenCalledWith({ companyId: 7 });
    expect(aiApprovalQueueAPI.list).toHaveBeenCalledWith({ companyId: 7 });

    expect(screen.getByText('A read-only accounting command center for DATEV readiness, Steuerberater preparation, missing evidence, bank review, AI signals, and safe next actions.')).toBeInTheDocument();

    expect(screen.getByText('Overall')).toBeInTheDocument();
    expect(screen.getByText('DATEV')).toBeInTheDocument();
    expect(screen.getByText('Tax')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();

    expect(screen.getAllByText('80%').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    expect(screen.getByText('What needs attention today')).toBeInTheDocument();
    expect(screen.getByText('Attach missing expense receipts')).toBeInTheDocument();
    expect(screen.getByText('Review bank statements and unreconciled transactions')).toBeInTheDocument();

    expect(screen.getByText('Counts')).toBeInTheDocument();
    expect(screen.getByText('Draft Invoices')).toBeInTheDocument();
    expect(screen.getByText('Expenses Without Attachments')).toBeInTheDocument();
    expect(screen.getByText('Unreconciled Bank Transactions')).toBeInTheDocument();
    expect(screen.getByText('Pending AI Approvals')).toBeInTheDocument();
    expect(screen.getByText('AI Insights')).toBeInTheDocument();

    expect(screen.getByText('Pending AI Approval Queue')).toBeInTheDocument();
    expect(screen.getByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('Create expense draft from reviewed document')).toBeInTheDocument();
    expect(screen.getByText('Prepare expense draft proposal from OCR intake for reviewed document values.')).toBeInTheDocument();
    expect(screen.getByText('Vendor: DB Vertrieb GmbH')).toBeInTheDocument();
    expect(screen.getByText('Governance status')).toBeInTheDocument();
    expect(screen.getByText(/Read-only:/)).toBeInTheDocument();
    expect(screen.getByText(/Execution enabled:/)).toBeInTheDocument();
    expect(screen.getByText(/Approval decisions enabled:/)).toBeInTheDocument();

    expect(screen.getByText('Warnings checklist')).toBeInTheDocument();
    expect(screen.getByText('Draft Invoices Exist')).toBeInTheDocument();
    expect(screen.getByText('Draft invoices exist and will not be included in DATEV export preparation.')).toBeInTheDocument();

    expect(screen.getByText('Safety boundaries')).toBeInTheDocument();
    expect(screen.getByText('Read-only review center summary.')).toBeInTheDocument();
    expect(screen.getByText('No accounting posting is performed.')).toBeInTheDocument();
    expect(screen.getByText('No AI approval decision is performed.')).toBeInTheDocument();
    expect(screen.getByText('No DATEV upload is performed.')).toBeInTheDocument();
    expect(screen.getByText('No ELSTER submission is performed.')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Open Tax Bridge' })).toHaveAttribute('href', '/tax-bridge');
    expect(screen.getAllByRole('link', { name: /Open AI Manager/i })[0]).toHaveAttribute('href', '/ai-manager');
  });

  it('does not render unsafe action controls', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Smart Review Center')).toBeInTheDocument());

    const unsafePatterns = [
      /^Approve$/i,
      /^Reject$/i,
      /^Execute$/i,
      /^Post ledger$/i,
      /^Submit to ELSTER$/i,
      /^Send to Finanzamt$/i,
      /^DATEV upload$/i,
      /officially filed/i,
      /tax filing completed/i,
    ];

    unsafePatterns.forEach((pattern) => {
      expect(screen.queryByRole('button', { name: pattern })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: pattern })).not.toBeInTheDocument();
      expect(screen.queryByText(pattern)).not.toBeInTheDocument();
    });
  });
});
