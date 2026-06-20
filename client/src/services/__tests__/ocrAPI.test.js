import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api';
import { recheckIntakeDocument } from '../ocrAPI';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    post: vi.fn(),
  },
}));

describe('ocrAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts reviewed values to the intake recheck endpoint', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        reviewState: { status: 'rechecked' },
      },
    });

    const payload = {
      reviewedValues: {
        vendorName: 'DB Fernverkehr AG',
      },
      changeReason: 'Corrected OCR fields before draft',
      manualOverride: null,
    };

    const result = await recheckIntakeDocument('doc-1', payload, { companyId: 42 });

    expect(api.post).toHaveBeenCalledWith('/ocr/intake/doc-1/recheck', payload, {
      headers: { 'X-Company-Id': 42 },
    });
    expect(result.reviewState.status).toBe('rechecked');
  });
});
