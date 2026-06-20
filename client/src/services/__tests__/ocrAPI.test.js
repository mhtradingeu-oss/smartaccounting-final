import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '../api';
import { createDraftFromReviewedIntake, recheckIntakeDocument } from '../ocrAPI';

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

  it('posts reviewed draft creation requests to the intake create-draft endpoint', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        draft: { type: 'expense', id: 'expense-1', status: 'pending' },
      },
    });

    const payload = {
      decisionFingerprint: 'fp-reviewed',
      reason: 'Create draft from reviewed document values',
      companyId: 42,
    };

    const result = await createDraftFromReviewedIntake('doc-1', payload);

    expect(api.post).toHaveBeenCalledWith(
      '/ocr/intake/doc-1/create-draft',
      {
        decisionFingerprint: 'fp-reviewed',
        reason: 'Create draft from reviewed document values',
      },
      {
        headers: { 'X-Company-Id': 42 },
      },
    );
    expect(result.draft.status).toBe('pending');
  });
});
