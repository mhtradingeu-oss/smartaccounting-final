import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

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

vi.mock('../../services/companiesAPI', () => ({
  companiesAPI: {
    list: vi.fn(),
    clearCache: vi.fn(),
  },
}));

import Companies from '../Companies';
import CompanyContext from '../../context/CompanyContext';
import { companiesAPI } from '../../services/companiesAPI';

const TestCompanyProvider = ({ children, initialCompany = null }) => {
  const [activeCompany, setActiveCompany] = useState(initialCompany);
  const [companies, setCompanies] = useState(null);
  const [companiesError, setCompaniesError] = useState(null);

  const switchCompany = (company) => {
    setActiveCompany(company);
  };

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        activeCompanyId: activeCompany?.id ?? null,
        companies,
        setCompanies,
        switchCompany,
        companiesError,
        setCompaniesError,
        reloadCompanies: () => {},
        reloadToken: 0,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

describe('Companies page – API stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('fetches companies only once per mount (no duplicate calls)', async () => {
    companiesAPI.list.mockResolvedValueOnce([{ id: 1, name: 'TestCo' }]);

    render(
      <MemoryRouter>
        <TestCompanyProvider initialCompany={{ id: 1, name: 'TestCo' }}>
          <Companies />
        </TestCompanyProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('TestCo')).toBeInTheDocument());

    expect(companiesAPI.list).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 with backoff and eventually succeeds', async () => {
    vi.useFakeTimers();
    try {
      companiesAPI.list
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValueOnce([{ id: 2, name: 'BackoffCo' }]);

      render(
        <MemoryRouter>
          <TestCompanyProvider initialCompany={{ id: 2, name: 'BackoffCo' }}>
            <Companies />
          </TestCompanyProvider>
        </MemoryRouter>,
      );

      await act(async () => {
        await vi.runAllTimersAsync();
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText('BackoffCo')).toBeInTheDocument();

      expect(companiesAPI.list).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows empty state when no active company', async () => {
    companiesAPI.list.mockResolvedValueOnce([{ id: 3, name: 'NoActiveCo' }]);

    render(
      <MemoryRouter>
        <TestCompanyProvider>
          <Companies />
        </TestCompanyProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText('No active company')).toBeInTheDocument(),
    );
  });
});
