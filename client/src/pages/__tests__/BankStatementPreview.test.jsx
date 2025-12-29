import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

const mockNavigate = vi.fn();
let currentRole = 'admin';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    isAuthenticated: true,
    user: {
      role: currentRole,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    },
    token: 'preview-token',
    login: vi.fn(),
    logout: vi.fn(),
    rateLimit: false,
    rateLimitMessage: '',
    loading: false,
  }),
}));

vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { id: 1, name: 'Demo Company' },
    companies: [],
    setCompanies: vi.fn(),
    switchCompany: vi.fn(),
  }),
}));

vi.mock('../../services/bankStatementsAPI', async () => {
  const actual = await vi.importActual('../../services/bankStatementsAPI');
  return {
    ...actual,
    bankStatementsAPI: {
      previewDryRun: vi.fn(),
      confirmImport: vi.fn(),
    },
  };
});

import BankStatementPreview from '../BankStatementPreview';
import { bankStatementsAPI } from '../../services/bankStatementsAPI';
import { setBankImportEnabled, resetBankImportEnabled } from '../../lib/featureFlags';

const previewResponse = {
  confirmationToken: 'token-123',
  dryRunId: 88,
  summary: {
    transactionsDetected: 2,
    validTransactions: 2,
    invalidTransactions: 0,
    currency: 'EUR',
    dateRange: { from: '2024-01-01', to: '2024-01-02' },
  },
  matches: [],
  unmatched: [],
  warnings: [],
};

const renderPreview = () =>
  render(
    <MemoryRouter>
      <BankStatementPreview />
    </MemoryRouter>,
  );

beforeEach(() => {
  setBankImportEnabled(true);
  currentRole = 'admin';
  mockNavigate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
  resetBankImportEnabled();
});

describe('BankStatementPreview confirmation flow', () => {
  const selectFile = () => {
    const file = new File(['data'], 'statement.csv', { type: 'text/csv' });
    const input = document.getElementById('bank-statement-preview-input');
    if (!input) {
      throw new Error('File input not found');
    }
    fireEvent.change(input, { target: { files: [file] } });
  };

  const waitForPreview = async () => {
    await waitFor(() => {
      expect(screen.getByText(/Step 3 · Confirm import/i)).toBeInTheDocument();
    });
  };

  it('enables confirm button only after the checkbox is explicit', async () => {
    bankStatementsAPI.previewDryRun.mockResolvedValue(previewResponse);

    renderPreview();
    selectFile();

    await waitForPreview();

    const button = screen.getByRole('button', { name: /confirm import/i });
    expect(button).toBeDisabled();

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this action imports the statement permanently/i,
    });
    fireEvent.click(checkbox);
    expect(button).toBeEnabled();
  });

  it('does not allow confirmation for read-only roles', async () => {
    currentRole = 'viewer';
    bankStatementsAPI.previewDryRun.mockResolvedValue(previewResponse);

    renderPreview();
    selectFile();

    await waitForPreview();

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this action imports the statement permanently/i,
    });
    fireEvent.click(checkbox);

    const button = screen.getByRole('button', { name: /confirm import/i });
    expect(button).toBeDisabled();
  });

  it('calls confirm API and redirects on successful confirmation', async () => {
    bankStatementsAPI.previewDryRun.mockResolvedValue(previewResponse);
    bankStatementsAPI.confirmImport.mockResolvedValue({
      data: {
        bankStatementId: '123',
        summary: { transactionsDetected: 5 },
      },
    });

    renderPreview();
    selectFile();

    await waitForPreview();

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this action imports the statement permanently/i,
    });
    fireEvent.click(checkbox);

    const button = screen.getByRole('button', { name: /confirm import/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(bankStatementsAPI.confirmImport).toHaveBeenCalledWith('token-123');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/bank-statements/123', {
        state: {
          statement: expect.objectContaining({
            id: '123',
            fileName: 'statement.csv',
            status: 'PROCESSING',
          }),
        },
        replace: true,
      });
    });
  });
});
