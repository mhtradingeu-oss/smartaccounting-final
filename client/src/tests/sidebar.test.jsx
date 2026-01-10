import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/Sidebar';
import AuthContext from '../context/AuthContext';
import { RoleProvider, roles } from '../context/RoleContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const createAuthValue = (role, companyId = 1) => ({
  status: 'authenticated',
  isAuthenticated: true,
  user: {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@example.com',
    role,
    companyId,
  },
  token: 'sidebar-token',
  login: vi.fn(),
  logout: vi.fn(),
  rateLimit: false,
  rateLimitMessage: '',
  loading: false,
});

const renderSidebar = (role, companyId) => {
  const authValue = createAuthValue(role, companyId);
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
  it('hides administration links for non-admin roles', () => {
    renderSidebar(roles.VIEWER);

    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  });

  it('shows administration links for admin role', () => {
    renderSidebar(roles.ADMIN, 1);

    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
  });

  it('shows system admin dashboard for system admin role', () => {
    renderSidebar(roles.ADMIN, null);

    expect(screen.getByRole('link', { name: /system_admin_dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  });
});
