import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
