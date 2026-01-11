import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import AIAssistant from '../AIAssistant';
import CompanyContext from '../../context/CompanyContext';
import { aiAssistantAPI } from '../../services/aiAssistantAPI';

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
    },
  }),
}));

vi.mock('../../services/aiAssistantAPI', () => ({
  aiAssistantAPI: {
    startSession: vi.fn(),
    getContext: vi.fn(),
    askIntent: vi.fn(),
    askIntentStream: vi.fn(),
    reset: vi.fn(),
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

describe('AI Assistant page – requestId traceability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('renders requestId when present on assistant responses', async () => {
    window.fetch = vi.fn();
    window.ReadableStream = function ReadableStream() {};
    aiAssistantAPI.startSession.mockResolvedValueOnce({ sessionId: 'session-test' });
    aiAssistantAPI.getContext.mockResolvedValueOnce({
      company: { id: 1, name: 'TraceCo', city: 'Berlin', country: 'DE', aiEnabled: true },
      invoices: [],
      expenses: [],
      bankTransactions: [],
      insights: [],
    });
    aiAssistantAPI.askIntent.mockResolvedValueOnce({
      answer: { message: 'Traceable response', highlights: [], references: [] },
      requestId: 'req-123',
    });

    render(
      <MemoryRouter>
        <TestCompanyProvider initialCompany={{ id: 1, name: 'TraceCo' }}>
          <AIAssistant />
        </TestCompanyProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('AI Accounting Assistant')).toBeInTheDocument());

    const intentButton = screen.getByRole('button', { name: /What needs my attention/i });
    await act(async () => {
      fireEvent.click(intentButton);
    });

    await waitFor(() => expect(screen.getByText('Traceable response')).toBeInTheDocument());

    const toggle = screen.getByRole('button', { name: /Show request IDs/i });
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByText(/Request ID: req-123/i)).toBeInTheDocument();
  });

  it('renders partial streamed chunks', async () => {
    window.fetch = vi.fn();
    window.ReadableStream = function ReadableStream() {};
    aiAssistantAPI.startSession.mockResolvedValueOnce({ sessionId: 'session-test' });
    aiAssistantAPI.getContext.mockResolvedValueOnce({
      company: { id: 1, name: 'TraceCo', city: 'Berlin', country: 'DE', aiEnabled: true },
      invoices: [],
      expenses: [],
      bankTransactions: [],
      insights: [],
    });
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

    const intentButton = screen.getByRole('button', { name: /What needs my attention/i });
    await act(async () => {
      fireEvent.click(intentButton);
    });

    await waitFor(() => expect(screen.getByText('Hallo Welt')).toBeInTheDocument());
    expect(aiAssistantAPI.askIntent).not.toHaveBeenCalled();
  });
});
