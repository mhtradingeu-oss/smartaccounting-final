import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout';
import { aiAssistantAPI } from '../../services/aiAssistantAPI';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
  }),
}));

vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { id: 10, name: 'Test Company' },
  }),
}));

vi.mock('../../services/aiAssistantAPI', () => ({
  aiAssistantAPI: {
    askIntent: vi.fn(),
  },
}));

vi.mock('../Sidebar', () => ({
  default: () => <nav aria-label="Sidebar">Sidebar</nav>,
}));

vi.mock('../TopBar', () => ({
  default: () => <header>TopBar</header>,
}));

vi.mock('../Footer', () => ({
  default: () => <footer>Footer</footer>,
}));

describe('GlobalAICompanion in authenticated layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiAssistantAPI.askIntent.mockResolvedValue({
      sessionId: 'session-1',
      answer: { message: 'Review overdue invoices and unreconciled transactions.' },
    });
  });

  const renderLayout = () =>
    render(
      <MemoryRouter initialEntries={['/invoices/123/edit']}>
        <Layout>
          <main>Authenticated content</main>
        </Layout>
      </MemoryRouter>,
    );

  it('renders in the authenticated layout', () => {
    renderLayout();

    expect(screen.getByLabelText('AI Accounting Manager companion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open AI Manager' })).toBeInTheDocument();
  });

  it('opens and closes the companion panel', async () => {
    renderLayout();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open AI Manager' }));
    });

    expect(screen.getByText('AI Accounting Manager')).toBeInTheDocument();
    expect(screen.getByText('Read-only, audited, company-scoped')).toBeInTheDocument();
    expect(screen.getByText('Current page: Invoice edit')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close AI Manager' }));
    });

    expect(screen.queryByText('AI Accounting Manager')).not.toBeInTheDocument();
  });

  it('sends accounting-specific quick prompts through the assistant API', async () => {
    renderLayout();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open AI Manager' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Show VAT gaps/i }));
    });

    await waitFor(() => {
      expect(aiAssistantAPI.askIntent).toHaveBeenCalledWith({
        intent: 'vat',
        prompt: 'Show VAT evidence gaps for the active company.',
        sessionId: null,
        companyId: 10,
      });
    });
  });

  it('sends quick prompts through the assistant API', async () => {
    renderLayout();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open AI Manager' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /What should I review/i }));
    });

    await waitFor(() => {
      expect(aiAssistantAPI.askIntent).toHaveBeenCalledWith({
        intent: 'review',
        prompt: 'What should I review in my accounting workspace right now?',
        sessionId: null,
        companyId: 10,
      });
    });
    expect(
      await screen.findByText('Review overdue invoices and unreconciled transactions.'),
    ).toBeInTheDocument();
  });


  it('adds safe page context to explain-page prompts only', async () => {
    renderLayout();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open AI Manager' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Explain this page/i }));
    });

    await waitFor(() => {
      expect(aiAssistantAPI.askIntent).toHaveBeenCalledWith({
        intent: 'explain_page',
        prompt:
          'Explain the current accounting page and what I should pay attention to. Safe page context: module=invoices, routeName=invoice_edit, entityType=invoice, entityId=123.',
        sessionId: null,
        companyId: 10,
      });
    });
  });

  it('does not render write or action controls', async () => {
    renderLayout();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open AI Manager' }));
    });

    const forbiddenButtonNames = /approve|create invoice|upload|pay|delete|export|post|submit approval/i;
    expect(screen.queryByRole('button', { name: forbiddenButtonNames })).not.toBeInTheDocument();
  });
});
