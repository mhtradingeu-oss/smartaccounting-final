import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';
import { dashboardAPI } from '../../services/dashboardAPI';

let companyState = {
  activeCompany: { id: 7, name: 'Northwind GmbH' },
  companies: [],
  setCompanies: vi.fn(),
  switchCompany: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../../services/dashboardAPI', () => ({
  dashboardAPI: {
    getStats: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock('../../context/AuthContext', () => ({
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
  }),
}));

vi.mock('../../context/CompanyContext', () => ({
  __esModule: true,
  useCompany: () => companyState,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    companyState = {
      activeCompany: { id: 7, name: 'Northwind GmbH' },
      companies: [],
      setCompanies: vi.fn(),
      switchCompany: vi.fn(),
    };
    dashboardAPI.getStats.mockResolvedValue({
      data: {
        metrics: [
          {
            id: 'total-revenue',
            label: 'Total revenue',
            value: 120000,
            format: 'currency',
            currency: 'EUR',
            priority: 'primary',
          },
          {
            id: 'total-expenses',
            label: 'Total expenses',
            value: 45000,
            format: 'currency',
            currency: 'EUR',
            priority: 'primary',
          },
          {
            id: 'active-users',
            label: 'Active users',
            value: 8,
            format: 'number',
            priority: 'secondary',
          },
        ],
        monthlyData: [
          { month: 'Jan', revenue: 1000, invoices: 2 },
          { month: 'Feb', revenue: 2000, invoices: 3 },
        ],
        statusBreakdown: { PAID: 10, OVERDUE: 2 },
        latestInvoice: {
          id: 99,
          invoiceNumber: 'INV-099',
          status: 'PAID',
          amount: 5200,
          currency: 'EUR',
          createdAt: '2025-01-01',
        },
      },
    });
  });

  it('renders KPI, trends, and details sections from live data', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Executive KPIs')).toBeInTheDocument();
    });

    expect(screen.getByText('Trends')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Invoice status mix')).toBeInTheDocument();
    expect(screen.getByText('Latest invoice')).toBeInTheDocument();
    expect(screen.getByText('Operational signals')).toBeInTheDocument();
    expect(screen.getByText('Total revenue')).toBeInTheDocument();
    expect(screen.getByText('Active users')).toBeInTheDocument();
  });

  it('shows a company selection empty state when no active company is set', async () => {
    companyState = {
      ...companyState,
      activeCompany: null,
    };

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Select a company to view the dashboard'),
    ).toBeInTheDocument();
  });
});
