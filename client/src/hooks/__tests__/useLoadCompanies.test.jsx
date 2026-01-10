import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyProvider, useCompany } from '../../context/CompanyContext';
import { companiesAPI } from '../../services/companiesAPI';
import { useLoadCompanies } from '../useLoadCompanies';

vi.mock('../../services/companiesAPI', () => ({
  companiesAPI: {
    list: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'admin', companyId: 1 },
  }),
}));

const HookTester = () => {
  useLoadCompanies();
  const { companies } = useCompany();
  return <div>{companies?.[0]?.name ?? 'no-data'}</div>;
};

describe('useLoadCompanies hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches companies only once per mount and tolerates rerenders', async () => {
    companiesAPI.list.mockResolvedValue([{ id: 1, name: 'TestCo' }]);

    const { rerender } = render(
      <CompanyProvider>
        <HookTester />
      </CompanyProvider>,
    );

    await waitFor(() => expect(screen.getByText('TestCo')).toBeInTheDocument());

    expect(companiesAPI.list).toHaveBeenCalledTimes(1);

    rerender(
      <CompanyProvider>
        <HookTester />
      </CompanyProvider>,
    );

    expect(companiesAPI.list).toHaveBeenCalledTimes(1);
  });
});
