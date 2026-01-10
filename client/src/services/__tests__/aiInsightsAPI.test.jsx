import { describe, it, beforeEach, expect, vi } from 'vitest';
import { aiInsightsAPI } from '../aiInsightsAPI';
import { AI_INSIGHTS_PURPOSE, AI_POLICY_VERSION } from '../../lib/aiConstants';
import api from '../api';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
  },
}));

describe('aiInsightsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends AI headers and company scope for insights', async () => {
    api.get.mockResolvedValueOnce({
      data: { data: { insights: [], viewerLimited: false } },
    });
    await aiInsightsAPI.list({ companyId: 77 });
    const [, config] = api.get.mock.calls[0];
    expect(config.headers).toMatchObject({
      'x-ai-purpose': AI_INSIGHTS_PURPOSE,
      'x-ai-policy-version': AI_POLICY_VERSION,
      'X-Company-Id': 77,
    });
  });

  it('normalizes insight payloads from API contracts', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          insights: [
            {
              id: 'ins-1',
              type: 'Duplicate invoice',
              severity: 'high',
              confidenceScore: 0.88,
              summary: 'Duplicate invoice detected.',
              why: 'Same invoice number',
              entityType: 'invoice',
              entityId: 'INV-1001',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
          viewerLimited: true,
        },
      },
    });

    const result = await aiInsightsAPI.list({ companyId: 12 });
    expect(result.viewerLimited).toBe(true);
    expect(result.insights[0]).toMatchObject({
      id: 'ins-1',
      severity: 'high',
      confidence: 0.88,
      relatedEntity: 'invoice',
      timeframe: '2025-01-01T00:00:00Z',
    });
  });
});
