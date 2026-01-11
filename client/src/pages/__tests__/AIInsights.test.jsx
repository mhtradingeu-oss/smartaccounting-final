import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import AIInsights from '../AIInsights';
import CompanyContext from '../../context/CompanyContext';
import { aiInsightsAPI } from '../../services/aiInsightsAPI';

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

vi.mock('../../services/aiInsightsAPI', () => ({
  aiInsightsAPI: {
    list: vi.fn(),
  },
}));

vi.mock('../../lib/featureFlags', () => ({
  isAISuggestionsEnabled: () => false,
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

describe('AI Insights page – suggestions disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('shows disabled state and skips loading', () => {
    render(
      <MemoryRouter>
        <TestCompanyProvider initialCompany={{ id: 1, name: 'TestCo' }}>
          <AIInsights />
        </TestCompanyProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('AI suggestions unavailable')).toBeInTheDocument();
    expect(aiInsightsAPI.list).not.toHaveBeenCalled();
  });
});
