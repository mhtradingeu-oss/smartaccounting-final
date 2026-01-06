import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { CompanyProvider } from '../../context/CompanyContext';
import { companiesAPI } from '../../services/companiesAPI';

describe('Companies page – API stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('fetches companies only once per mount (no duplicate calls)', async () => {
    companiesAPI.list.mockResolvedValueOnce([{ id: 1, name: 'TestCo' }]);

    render(
      <CompanyProvider>
        <Companies />
      </CompanyProvider>,
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
        <CompanyProvider>
          <Companies />
        </CompanyProvider>,
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
});
