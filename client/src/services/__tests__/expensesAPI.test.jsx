import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expensesAPI } from '../expensesAPI';
import api from '../api';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('expensesAPI', () => {
  const companyId = 42;

  beforeEach(() => {
    expensesAPI.cache = {};
    expensesAPI.inFlight = {};
    expensesAPI._fetchCount = {};
    vi.clearAllMocks();
  });

  it('shares a single fetch across concurrent calls', async () => {
    api.get.mockResolvedValueOnce({ data: { expenses: [{ id: 1, status: 'PENDING' }] } });

    const [first, second] = await Promise.all([
      expensesAPI.list({ companyId }),
      expensesAPI.list({ companyId }),
    ]);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first[0].status).toBe('pending');
  });

  it('normalizes list response fields', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        expenses: [
          {
            id: 1,
            expenseDate: '2026-01-15',
            vendorName: 'Legacy Vendor',
            grossAmount: '119.00',
            status: 'PENDING',
          },
        ],
      },
    });

    const list = await expensesAPI.list({ companyId });

    expect(list[0]).toMatchObject({
      id: 1,
      date: '2026-01-15',
      vendor: 'Legacy Vendor',
      vendorName: 'Legacy Vendor',
      grossAmount: 119,
      amount: 119,
      status: 'pending',
      currency: 'EUR',
      attachments: [],
    });
  });

  it('clears cache after creating and reloads updated list', async () => {
    api.get.mockResolvedValueOnce({ data: { expenses: [{ id: 1 }] } });
    await expensesAPI.list({ companyId });
    expect(api.get).toHaveBeenCalledTimes(1);

    api.post.mockResolvedValueOnce({ data: { success: true, expense: { id: 99 } } });
    await expensesAPI.create({
      companyId,
      vendorName: 'Vendor',
      description: 'Demo',
      category: 'services',
      netAmount: 100,
      vatRate: 0.19,
    });
    expect(api.post).toHaveBeenCalledWith(
      '/expenses',
      expect.objectContaining({
        companyId,
        vendorName: 'Vendor',
        description: 'Demo',
        category: 'services',
        netAmount: 100,
        vatAmount: 19,
        grossAmount: 119,
        currency: 'EUR',
        status: 'pending',
      }),
      { headers: { 'X-Company-Id': companyId } },
    );

    api.get.mockResolvedValueOnce({ data: { expenses: [{ id: 1 }, { id: 2 }] } });
    const nextList = await expensesAPI.list({ companyId });
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(nextList).toHaveLength(2);
  });

  it('sends company header when getting one expense', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, expense: { id: 7, vendorName: 'Vendor', status: 'posted' } },
    });

    const response = await expensesAPI.get(7, { companyId });

    expect(api.get).toHaveBeenCalledWith('/expenses/7', {
      headers: { 'X-Company-Id': companyId },
    });
    expect(response.expense.status).toBe('booked');
    expect(response.expense.vendor).toBe('Vendor');
  });

  it('updates status with PATCH and clears cache', async () => {
    api.get.mockResolvedValueOnce({ data: { expenses: [{ id: 1, status: 'pending' }] } });
    await expensesAPI.list({ companyId });
    expect(expensesAPI.cache[companyId]).toBeDefined();

    api.patch.mockResolvedValueOnce({
      data: { success: true, expense: { id: 1, status: 'booked' } },
    });

    await expensesAPI.updateStatus(1, 'posted', { companyId });

    expect(api.patch).toHaveBeenCalledWith(
      '/expenses/1/status',
      { status: 'booked' },
      { headers: { 'X-Company-Id': companyId } },
    );
    expect(expensesAPI.cache[companyId]).toBeUndefined();
  });
});
