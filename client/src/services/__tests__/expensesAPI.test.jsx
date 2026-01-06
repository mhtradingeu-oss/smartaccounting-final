import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expensesAPI } from '../expensesAPI';
import api from '../api';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
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
    api.get.mockResolvedValueOnce({ data: { expenses: [{ id: 1 }] } });

    const [first, second] = await Promise.all([
      expensesAPI.list({ companyId }),
      expensesAPI.list({ companyId }),
    ]);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('clears cache after creating and reloads updated list', async () => {
    api.get.mockResolvedValueOnce({ data: { expenses: [{ id: 1 }] } });
    await expensesAPI.list({ companyId });
    expect(api.get).toHaveBeenCalledTimes(1);

    api.post.mockResolvedValueOnce({ data: { success: true, expense: { id: 99 } } });
    await expensesAPI.create({ companyId, vendorName: 'Vendor', description: 'Demo', category: 'services', grossAmount: 100 });
    expect(api.post).toHaveBeenCalledTimes(1);

    api.get.mockResolvedValueOnce({ data: { expenses: [{ id: 1 }, { id: 2 }] } });
    const nextList = await expensesAPI.list({ companyId });
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(nextList).toHaveLength(2);
  });
});
