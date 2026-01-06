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
});
