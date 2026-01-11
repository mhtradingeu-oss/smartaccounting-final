import { useState } from 'react';
import { render, screen } from '@testing-library/react';
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
      companyId: null,
    },
  }),
}));

vi.mock('../../services/aiAssistantAPI', () => ({
  aiAssistantAPI: {
    startSession: vi.fn(),
    getContext: vi.fn(),
    askIntent: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock('../../lib/featureFlags', () => ({
  isAIAssistantEnabled: () => true,
  isAIVoiceEnabled: () => false,
}));

const TestCompanyProvider = ({ children }) => {
  const [activeCompany, setActiveCompany] = useState(null);
  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        activeCompanyId: activeCompany?.id ?? null,
        companies: [],
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

describe('AI Assistant page – system admin blocked state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('shows system admin blocked state without calling AI APIs', () => {
    render(
      <MemoryRouter>
        <TestCompanyProvider>
          <AIAssistant />
        </TestCompanyProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('AI Assistant unavailable')).toBeInTheDocument();
    expect(aiAssistantAPI.startSession).not.toHaveBeenCalled();
    expect(aiAssistantAPI.getContext).not.toHaveBeenCalled();
  });
});
