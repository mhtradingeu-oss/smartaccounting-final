import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';

import TopBar from '../TopBar';
import { FEATURE_FLAGS } from '../../lib/constants';

vi.mock('../../hooks/useLoadCompanies', () => ({
  useLoadCompanies: vi.fn(),
}));
vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({ companies: [] }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    isAuthenticated: true,
    user: {
      role: 'admin',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    },
    token: 'token',
    logout: vi.fn(),
    login: vi.fn(),
    rateLimit: false,
    rateLimitMessage: '',
  }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

const originalFlag = FEATURE_FLAGS.GERMAN_TAX.enabled;

afterEach(() => {
  FEATURE_FLAGS.GERMAN_TAX.enabled = originalFlag;
});

describe('TopBar notifications', () => {
  it('omits german tax notification when feature is disabled', () => {
    FEATURE_FLAGS.GERMAN_TAX.enabled = false;

    render(
      <MemoryRouter>
        <TopBar
          isDarkMode={false}
          onToggleDarkMode={() => {}}
          isCollapsed={false}
          onToggleSidebar={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Review Tax/i)).not.toBeInTheDocument();
  });
});
