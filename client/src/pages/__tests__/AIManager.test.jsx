import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AIManager from '../AIManager';
import { aiAssistantAPI } from '../../services/aiAssistantAPI';
import { aiInsightsAPI } from '../../services/aiInsightsAPI';

vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { id: 10, name: 'Test Company' },
  }),
}));

vi.mock('../../services/aiAssistantAPI', () => ({
  aiAssistantAPI: {
    getContext: vi.fn(),
  },
}));

vi.mock('../../services/aiInsightsAPI', () => ({
  aiInsightsAPI: {
    list: vi.fn(),
  },
}));

describe('AI Manager page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiAssistantAPI.getContext.mockResolvedValue({
      invoices: [
        { id: 1, status: 'OVERDUE' },
        { id: 2, status: 'PAID' },
      ],
      expenses: [{ id: 3, status: 'pending' }],
      bankTransactions: [
        { id: 4, description: 'Bank payment', isReconciled: false },
        { id: 5, description: 'Reconciled payment', isReconciled: true },
      ],
    });
    aiInsightsAPI.list.mockResolvedValue({
      viewerLimited: false,
      insights: [
        {
          id: 'risk-1',
          severity: 'high',
          type: 'Duplicate invoice risk',
          summary: 'Potential duplicate invoice needs review.',
        },
      ],
    });
  });

  it('renders live read-only AI Manager data', async () => {
    render(
      <MemoryRouter>
        <AIManager />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Loading AI Manager data')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('AI Accounting Manager')).toBeInTheDocument());

    expect(aiAssistantAPI.getContext).toHaveBeenCalledWith({ companyId: 10 });
    expect(aiInsightsAPI.list).toHaveBeenCalledWith({ companyId: 10 });

    expect(screen.getByText('Today’s Accounting Briefing')).toBeInTheDocument();
    expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
    expect(screen.getByText('Ask AI Manager')).toBeInTheDocument();

    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Bank activity')).toBeInTheDocument();
    expect(screen.getByText('AI insights')).toBeInTheDocument();

    expect(screen.getAllByText('Potential duplicate invoice needs review.')).toHaveLength(2);
    expect(screen.getByText('Bank payment')).toBeInTheDocument();
    expect(screen.getByText('Invoice #1')).toBeInTheDocument();
  });

  it('does not render write controls', async () => {
    render(
      <MemoryRouter>
        <AIManager />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('AI Accounting Manager')).toBeInTheDocument());

    const forbiddenButtonNames = /approve|create invoice|upload|pay|delete|post|submit approval/i;
    expect(screen.queryByRole('button', { name: forbiddenButtonNames })).not.toBeInTheDocument();
  });
});
