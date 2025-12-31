import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Sidebar from '../components/Sidebar';
import AuthContext from '../context/AuthContext';
import { RoleProvider, roles } from '../context/RoleContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const createAuthValue = (role) => ({
  status: 'authenticated',
  isAuthenticated: true,
  user: {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@example.com',
    role,
  },
  token: 'sidebar-token',
  login: vi.fn(),
  logout: vi.fn(),
  rateLimit: false,
  rateLimitMessage: '',
  loading: false,
});

const renderSidebar = (role) => {
  const authValue = createAuthValue(role);
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <RoleProvider user={authValue.user}>
          <Sidebar isCollapsed={false} onToggleCollapse={() => {}} />
        </RoleProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Sidebar role & feature flags', () => {
  afterEach(() => cleanup());

  it('hides administration links for non-admin roles', () => {
    renderSidebar(roles.VIEWER);
    expect(screen.queryByText('navigation.users')).toBeNull();
  });

  it('shows administration links for admin role', () => {
    renderSidebar(roles.ADMIN);
    expect(screen.getByText('navigation.users')).toBeInTheDocument();
  });

  it('does not render coming soon badges once features are hidden', () => {
    renderSidebar(roles.ADMIN);
    const badges = screen.queryAllByText(/Coming soon/i);
    expect(badges.length).toBe(0);
  });
});
