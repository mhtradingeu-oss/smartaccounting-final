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
  const renderAIManager = () => render(
    <MemoryRouter>
      <AIManager />
    </MemoryRouter>,
  );

  const mockContext = (overrides = {}) => {
    aiAssistantAPI.getContext.mockResolvedValue({
      invoices: [],
      expenses: [],
      bankTransactions: [],
      ...overrides,
    });
  };

  const mockInsights = (insights = []) => {
    aiInsightsAPI.list.mockResolvedValue({
      viewerLimited: false,
      insights,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext({
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
    mockInsights([
      {
        id: 'risk-1',
        severity: 'high',
        type: 'Duplicate invoice risk',
        summary: 'Potential duplicate invoice needs review.',
      },
    ]);
  });

  it('renders live read-only AI Manager data', async () => {
    renderAIManager();

    expect(screen.getByLabelText('Loading AI Manager data')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('AI Accounting Manager')).toBeInTheDocument());

    expect(aiAssistantAPI.getContext).toHaveBeenCalledWith({ companyId: 10 });
    expect(aiInsightsAPI.list).toHaveBeenCalledWith({ companyId: 10 });

    expect(screen.getByText('Today’s Accounting Briefing')).toBeInTheDocument();
    expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
    expect(screen.getByText('Priority decision')).toBeInTheDocument();
    expect(screen.getByText('Next best action')).toBeInTheDocument();
    expect(screen.getByText('Why this matters')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Review queue')).toBeInTheDocument();
    expect(screen.getByText('Ask AI Manager')).toBeInTheDocument();

    expect(screen.getByText('What AI can help with')).toBeInTheDocument();
    expect(screen.getByText(/SmartAccounting AI can read, analyze, explain/i)).toBeInTheDocument();
    expect(screen.getByText('VAT / Umsatzsteuer')).toBeInTheDocument();
    expect(screen.getByText('DATEV & audit readiness')).toBeInTheDocument();
    expect(screen.getByText(/qualified Steuerberater/i)).toBeInTheDocument();

    expect(screen.getAllByText('Invoices').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expenses').length).toBeGreaterThan(0);
    expect(screen.getByText('Bank activity')).toBeInTheDocument();
    expect(screen.getAllByText('AI insights')).not.toHaveLength(0);

    expect(screen.getAllByText('Potential duplicate invoice needs review.')).not.toHaveLength(0);
    expect(screen.getByText('Bank payment')).toBeInTheDocument();
    expect(screen.getByText('Invoice #1')).toBeInTheDocument();
  });

  it('selects a high severity insight as the priority decision', async () => {
    renderAIManager();

    await waitFor(() => expect(screen.getByText('Priority decision')).toBeInTheDocument());

    expect(screen.getAllByText('Potential duplicate invoice needs review.')).not.toHaveLength(0);
    expect(screen.getAllByText('High-severity insights are reviewed before routine accounting follow-up.')).not.toHaveLength(0);
    expect(screen.getAllByText('Open AI insights')).not.toHaveLength(0);
  });

  it('selects an unreconciled bank transaction when no high insight exists', async () => {
    mockInsights([
      {
        id: 'medium-1',
        severity: 'medium',
        type: 'Cash flow reminder',
        summary: 'Review cash flow timing.',
      },
    ]);

    renderAIManager();

    await waitFor(() => expect(screen.getByText('Priority decision')).toBeInTheDocument());

    expect(screen.getAllByText('Bank payment')).not.toHaveLength(0);
    expect(screen.getAllByText('Review bank statements')).not.toHaveLength(0);
    expect(screen.getByText('Unreconciled bank transaction')).toBeInTheDocument();
  });

  it('selects a pending or draft invoice when no higher priority exists', async () => {
    mockContext({
      invoices: [
        { id: 77, status: 'DRAFT' },
        { id: 78, status: 'PAID' },
      ],
      expenses: [],
      bankTransactions: [
        { id: 4, description: 'Reconciled payment', isReconciled: true },
      ],
    });
    mockInsights([]);

    renderAIManager();

    await waitFor(() => expect(screen.getByText('Priority decision')).toBeInTheDocument());

    expect(screen.getAllByText('Invoice #77')).not.toHaveLength(0);
    expect(screen.getAllByText('Review invoices')).not.toHaveLength(0);
    expect(screen.getAllByText('Status: DRAFT')).not.toHaveLength(0);
  });

  it('renders evidence source, rule, and entity where available', async () => {
    renderAIManager();

    await waitFor(() => expect(screen.getByText('Evidence')).toBeInTheDocument());

    expect(
      screen.getByText((content) => (
        content.includes('Source: AI insights')
        && content.includes('Rule: Priority 1: high severity insights')
        && content.includes('Entity: insight #risk-1')
      )),
    ).toBeInTheDocument();
  });

  it('does not render write-action labels', async () => {
    renderAIManager();

    await waitFor(() => expect(screen.getByText('AI Accounting Manager')).toBeInTheDocument());

    const forbiddenActionButtons = /approve|reject|resolve|post|delete|reconcile now/i;
    expect(screen.queryByRole('button', { name: forbiddenActionButtons })).not.toBeInTheDocument();
  });

  it('keeps API calls scoped to companyId', async () => {
    renderAIManager();

    await waitFor(() => expect(screen.getByText('AI Accounting Manager')).toBeInTheDocument());

    expect(aiAssistantAPI.getContext).toHaveBeenCalledWith({ companyId: 10 });
    expect(aiInsightsAPI.list).toHaveBeenCalledWith({ companyId: 10 });
  });
});
