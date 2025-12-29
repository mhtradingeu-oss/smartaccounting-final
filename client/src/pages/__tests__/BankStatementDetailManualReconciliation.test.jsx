import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockLocation = {
  pathname: '/bank-statements/123',
  state: { statement: { fileName: 'statement.csv', status: 'COMPLETED' } },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({ statementId: '123' }),
  };
});

let currentRole = 'admin';
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
    token: 'token',
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

const sampleTransactions = [
  {
    id: 101,
    transactionDate: '2025-01-01T00:00:00.000Z',
    description: 'Bank TX',
    amount: 500,
    currency: 'EUR',
    isReconciled: false,
    category: null,
  },
];

const sampleInvoices = [
  {
    id: 201,
    invoiceNumber: 'INV-001',
    total: 500,
    amount: 500,
    currency: 'EUR',
    status: 'SENT',
    date: '2025-01-10',
  },
];

const sampleExpenses = [
  {
    id: 301,
    description: 'Office rent',
    grossAmount: 400,
    amount: 400,
    currency: 'EUR',
    status: 'draft',
    expenseDate: '2025-01-05',
    vendorName: 'Demo Vendor',
  },
];

vi.mock('../../services/bankStatementsAPI', async () => {
  const actual = await vi.importActual('../../services/bankStatementsAPI');
  return {
    ...actual,
    bankStatementsAPI: {
      ...actual.bankStatementsAPI,
      transactions: vi.fn(),
      updateTransaction: vi.fn(),
      reconcileTransaction: vi.fn(),
    },
  };
});

vi.mock('../../services/invoicesAPI', () => ({
  invoicesAPI: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/expensesAPI', () => ({
  expensesAPI: {
    list: vi.fn(),
  },
}));

import BankStatementDetail from '../BankStatementDetail';
import { bankStatementsAPI } from '../../services/bankStatementsAPI';
import { invoicesAPI } from '../../services/invoicesAPI';
import { expensesAPI } from '../../services/expensesAPI';

const renderDetail = () =>
  render(
    <MemoryRouter>
      <BankStatementDetail />
    </MemoryRouter>,
  );

beforeEach(() => {
  currentRole = 'admin';
  mockNavigate.mockReset();
  bankStatementsAPI.transactions.mockResolvedValue(sampleTransactions);
  bankStatementsAPI.updateTransaction.mockResolvedValue(sampleTransactions[0]);
  bankStatementsAPI.reconcileTransaction.mockResolvedValue({
    data: {
      ...sampleTransactions[0],
      isReconciled: true,
      reconciledWith: 'tx-ledger-id',
    },
  });
  invoicesAPI.list.mockResolvedValue(sampleInvoices);
  expensesAPI.list.mockResolvedValue(sampleExpenses);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('BankStatementDetail manual reconciliation', () => {
  it('enables confirm only after the acknowledgement checkbox', async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Bank TX')).toBeInTheDocument();
    });

    const manualButton = screen.getByRole('button', { name: /Reconcile manually/i });
    fireEvent.click(manualButton);

    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('INV-001'));

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this action will be recorded and can only be undone manually\./i,
    });
    const confirmButton = screen.getByRole('button', { name: /Confirm reconciliation/i });

    expect(confirmButton).toBeDisabled();
    fireEvent.click(checkbox);
    expect(confirmButton).toBeEnabled();
  });

  it('calls the reconcile API with the selected target', async () => {
    renderDetail();

    await waitFor(() => screen.getByText('Bank TX'));
    fireEvent.click(screen.getByRole('button', { name: /Reconcile manually/i }));
    await waitFor(() => screen.getByText('INV-001'));
    fireEvent.click(screen.getByText('INV-001'));

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this action will be recorded and can only be undone manually\./i,
    });
    fireEvent.click(checkbox);

    const reasonField = screen.getByLabelText(/Reason \(optional\)/i);
    fireEvent.change(reasonField, { target: { value: 'Manual match note' } });

    const confirmButton = screen.getByRole('button', { name: /Confirm reconciliation/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(bankStatementsAPI.reconcileTransaction).toHaveBeenCalledWith(101, {
        targetType: 'invoice',
        targetId: 201,
        reason: 'Manual match note',
      });
    });
  });

  it('refreshes the list and surfaces success copy upon confirmation', async () => {
    renderDetail();

    await waitFor(() => screen.getByText('Bank TX'));
    fireEvent.click(screen.getByRole('button', { name: /Reconcile manually/i }));
    await waitFor(() => screen.getByText('INV-001'));
    fireEvent.click(screen.getByText('INV-001'));

    const checkbox = screen.getByRole('checkbox', {
      name: /I understand this action will be recorded and can only be undone manually\./i,
    });
    fireEvent.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /Confirm reconciliation/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(bankStatementsAPI.transactions).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Transaction reconciled with Invoice INV-001\./i),
      ).toBeInTheDocument();
    });
  });
});
