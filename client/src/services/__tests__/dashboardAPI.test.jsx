import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dashboardAPI } from '../dashboardAPI';
import api from '../api';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../lib/demoMode', () => ({
  isDemoMode: () => false,
  DEMO_DATA: { dashboard: { metric: 'demo' } },
}));

describe('dashboardAPI', () => {
  beforeEach(() => {
    dashboardAPI.clearCache();
    vi.clearAllMocks();
  });

  it('shares a single fetch for concurrent calls', async () => {
    api.get.mockResolvedValueOnce({ data: { total: 1, success: true } });

    const [first, second] = await Promise.all([
      dashboardAPI.getStats(),
      dashboardAPI.getStats(),
    ]);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(first.data).toEqual(second.data);
  });

  it('surfaces rate limit errors without retry loops', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 429 } });

    await expect(dashboardAPI.getStats()).rejects.toMatchObject({
      status: 429,
      rateLimited: true,
    });

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('prefers financialOverview for accounting KPI metrics while preserving operational details', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        companyId: 99,
        stats: {
          totalRevenue: 119,
          totalExpenses: 59.5,
          netProfit: 59.5,
          invoiceCount: 2,
          overdue: 1,
          users: { active: 3 },
        },
        invoiceStats: {
          totalRevenue: 119,
          invoiceCount: 2,
          statusBreakdown: { PAID: 1, OVERDUE: 1 },
          latestInvoice: {
            invoiceNumber: 'INV-FO-1',
            amount: 119,
            currency: 'EUR',
          },
        },
        financialOverview: {
          source: 'posted_journal_entries',
          revenue: 700,
          expenses: 200,
          netIncome: 500,
          isProfit: true,
        },
        monthlyData: [{ month: 'Jan', revenue: 119, invoices: 2 }],
      },
    });

    const response = await dashboardAPI.getStats({ companyId: 99 });

    expect(response.data.financialOverview).toMatchObject({
      source: 'posted_journal_entries',
      revenue: 700,
      expenses: 200,
      netIncome: 500,
    });

    expect(response.data.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'total-revenue',
          value: 700,
          description: 'Accounting revenue from posted journal entries',
        }),
        expect.objectContaining({
          id: 'total-expenses',
          value: 200,
          description: 'Accounting expenses from posted journal entries',
        }),
        expect.objectContaining({
          id: 'net-profit',
          value: 500,
          description: 'Accounting net income from posted journal entries',
        }),
        expect.objectContaining({ id: 'invoices-count', value: 2 }),
        expect.objectContaining({ id: 'overdue-invoices', value: 1 }),
        expect.objectContaining({ id: 'active-users', value: 3 }),
      ]),
    );
  });

  it('normalizes dashboard payloads with stats, invoiceStats, and monthlyData', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        companyId: 99,
        stats: {
          totalRevenue: 120000,
          totalExpenses: 45000,
          netProfit: 75000,
          invoiceCount: 42,
          overdue: 2,
          users: { active: 8 },
        },
        invoiceStats: {
          statusBreakdown: { paid: 10, overdue: 2 },
          latestInvoice: {
            id: 7,
            invoiceNumber: 'INV-700',
            status: 'PAID',
            amount: 5200,
            currency: 'EUR',
          },
        },
        monthlyData: [
          { month: 'Jan', revenue: 1000, invoices: 2 },
          { month: 'Feb', revenue: 2000, invoices: 3 },
        ],
      },
    });

    const response = await dashboardAPI.getStats({ companyId: 99 });

    expect(response.data).toMatchObject({
      companyId: 99,
      totalRevenue: 120000,
      totalExpenses: 45000,
      netProfit: 75000,
      invoiceCount: 42,
      statusBreakdown: { paid: 10, overdue: 2 },
      latestInvoice: {
        invoiceNumber: 'INV-700',
        amount: 5200,
        currency: 'EUR',
      },
    });
    expect(response.data.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'total-revenue', value: 120000, format: 'currency' }),
        expect.objectContaining({ id: 'total-expenses', value: 45000, format: 'currency' }),
        expect.objectContaining({ id: 'net-profit', value: 75000, format: 'currency' }),
        expect.objectContaining({ id: 'invoices-count', value: 42, format: 'number' }),
        expect.objectContaining({ id: 'overdue-invoices', value: 2, format: 'number' }),
        expect.objectContaining({ id: 'active-users', value: 8, format: 'number' }),
      ]),
    );
    expect(response.data.monthlyData).toHaveLength(2);
  });
});
