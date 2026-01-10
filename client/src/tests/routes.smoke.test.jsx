import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../pages/Analytics', () => ({
  __esModule: true,
  default: () => <div>Analytics page</div>,
}));
vi.mock('../pages/AIInsights', () => ({
  __esModule: true,
  default: () => <div>AI insights page</div>,
}));
vi.mock('../pages/AIAssistant', () => ({
  __esModule: true,
  default: () => <div>AI assistant page</div>,
}));
vi.mock('../pages/Dashboard', () => ({
  __esModule: true,
  default: () => <div>Dashboard page</div>,
}));
vi.mock('../pages/Invoices', () => ({
  __esModule: true,
  default: () => <div>Invoices page</div>,
}));
vi.mock('../pages/InvoiceCreate', () => ({
  __esModule: true,
  default: () => <div>Invoice create page</div>,
}));
vi.mock('../pages/InvoiceEdit', () => ({
  __esModule: true,
  default: () => <div>Invoice edit page</div>,
}));
vi.mock('../pages/Expenses', () => ({
  __esModule: true,
  default: () => <div>Expenses page</div>,
}));
vi.mock('../pages/ExpensesCreate', () => ({
  __esModule: true,
  default: () => <div>Expenses create page</div>,
}));
vi.mock('../pages/BankStatements', () => ({
  __esModule: true,
  default: () => <div>Bank statements page</div>,
}));
vi.mock('../pages/OCRPreview', () => ({
  __esModule: true,
  default: () => <div>OCR preview page</div>,
}));
vi.mock('../pages/BankStatementDetail', () => ({
  __esModule: true,
  default: () => <div>Bank statement detail page</div>,
}));
vi.mock('../pages/Billing', () => ({
  __esModule: true,
  default: () => <div>Billing page</div>,
}));
vi.mock('../pages/Companies', () => ({
  __esModule: true,
  default: () => <div>Companies page</div>,
}));
vi.mock('../pages/Users', () => ({
  __esModule: true,
  default: () => <div>Users page</div>,
}));
vi.mock('../pages/Login', () => ({
  __esModule: true,
  default: () => <div>Login page</div>,
}));
vi.mock('../pages/GermanTaxReports', () => ({
  __esModule: true,
  default: () => <div>German tax reports page</div>,
}));
vi.mock('../pages/OnboardingWizard', () => ({
  __esModule: true,
  default: () => <div>Onboarding wizard page</div>,
}));
vi.mock('../pages/RBACManagement', () => ({
  __esModule: true,
  default: () => <div>RBAC management page</div>,
}));
vi.mock('../pages/InvestorDashboard', () => ({
  __esModule: true,
  default: () => <div>Investor dashboard page</div>,
}));
vi.mock('../pages/AuditLogs', () => ({
  __esModule: true,
  default: () => <div>Audit logs page</div>,
}));
vi.mock('../pages/GDPRActions', () => ({
  __esModule: true,
  default: () => <div>GDPR actions page</div>,
}));

vi.mock('../components/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../context/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    status: 'authenticated',
    isAuthenticated: true,
    user: {
      role: 'admin',
      firstName: 'Demo',
      lastName: 'Admin',
      email: 'demo@demo.com',
    },
    token: 'route-smoke-token',
    login: vi.fn(),
    logout: vi.fn(),
    rateLimit: false,
    rateLimitMessage: '',
    loading: false,
  }),
}));

vi.mock('../context/CompanyContext', () => ({
  __esModule: true,
  useCompany: () => ({
    activeCompany: { id: 1, name: 'Demo Company' },
    companies: [],
    setCompanies: vi.fn(),
    switchCompany: vi.fn(),
  }),
}));

vi.mock('../context/RoleContext', () => ({
  __esModule: true,
  roles: {
    ADMIN: 'admin',
    ACCOUNTANT: 'accountant',
    AUDITOR: 'auditor',
    VIEWER: 'viewer',
  },
  useRole: () => ({ role: 'admin' }),
}));

import { AppRoutes } from '../App';

const routeTestCases = [
  { path: '/', expectedText: 'Dashboard page' },
  { path: '/login', expectedText: 'Dashboard page' },
  { path: '/pricing', expectedText: 'Plans built for modern finance teams.' },
  { path: '/request-access', expectedText: 'Tell us about your team and we will reserve a seat for you.' },
  { path: '/onboarding', expectedText: 'Onboarding wizard page' },
  { path: '/rbac', expectedText: 'RBAC management page' },
  { path: '/investor-dashboard', expectedText: 'Investor dashboard page' },
  { path: '/analytics', expectedText: 'Analytics page' },
  { path: '/ai-advisor', expectedText: 'AI insights page' },
  { path: '/ai-assistant', expectedText: 'AI assistant page' },
  { path: '/dashboard', expectedText: 'Dashboard page' },
  { path: '/invoices', expectedText: 'Invoices page' },
  { path: '/expenses', expectedText: 'Expenses page' },
  { path: '/expenses/create', expectedText: 'Expenses create page' },
  { path: '/invoices/create', expectedText: 'Invoice create page' },
  { path: '/invoices/42/edit', expectedText: 'Invoice edit page' },
  { path: '/bank-statements', expectedText: 'Bank statements page' },
  { path: '/bank-statements/import', expectedText: 'Import will save data to the server.' },
  { path: '/bank-statements/123', expectedText: 'Bank statement detail page' },
  { path: '/ocr-preview', expectedText: 'OCR preview page' },
  { path: '/billing', expectedText: 'Billing unavailable' },
  { path: '/german-tax-reports/status', expectedText: 'German tax reports page' },
  { path: '/companies', expectedText: 'Companies page' },
  { path: '/users', expectedText: 'Users page' },
  { path: '/compliance', expectedText: 'Compliance unavailable' },
  { path: '/audit-logs', expectedText: 'Audit logs page' },
  { path: '/gdpr-actions', expectedText: 'GDPR actions page' },
  { path: '/compliance-dashboard', expectedText: 'Compliance unavailable' },
];

describe('Route smoke test', () => {
  afterEach(() => cleanup());

  it.each(routeTestCases)('renders %s without hitting not-found', async ({ path, expectedText }) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });
});
