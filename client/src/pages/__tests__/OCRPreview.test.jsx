import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    isAuthenticated: true,
    user: {
      role: 'admin',
      firstName: 'Preview',
      lastName: 'Tester',
      email: 'preview@example.com',
    },
    token: 'preview-token',
    login: vi.fn(),
    logout: vi.fn(),
    rateLimit: false,
    rateLimitMessage: '',
    loading: false,
  }),
}));

vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    activeCompany: { id: 1, name: 'Preview Company' },
    companies: [],
    setCompanies: vi.fn(),
    switchCompany: vi.fn(),
  }),
}));

vi.mock('../../services/ocrAPI', () => ({
  previewDocument: vi.fn(),
}));

import OCRPreview from '../OCRPreview';
import { previewDocument } from '../../services/ocrAPI';
import { setOCRPreviewEnabled, resetOCRPreviewEnabled } from '../../lib/featureFlags';

const renderPreviewPage = () =>
  render(
    <MemoryRouter>
      <OCRPreview />
    </MemoryRouter>,
  );

beforeEach(() => {
  setOCRPreviewEnabled(true);
  previewDocument.mockReset();
});

afterEach(() => {
  cleanup();
  resetOCRPreviewEnabled();
});

describe('OCRPreview page', () => {
  it('renders structured preview after uploading a supported file', async () => {
    const previewPayload = {
      type: 'invoice',
      confidence: 78.5,
      fields: { vendor: 'Acme GmbH', amount: 150.25 },
      warnings: ['Missing IBAN'],
      explanations: ['Vendor found in header'],
      rawText: 'Sample OCR text line.',
    };

    previewDocument.mockResolvedValue(previewPayload);

    renderPreviewPage();

    const input = screen.getByLabelText(/choose a file/i);
    const file = new File(['dummy'], 'invoice.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(previewDocument).toHaveBeenCalled();
    });

    expect(screen.getAllByText(/No data has been saved/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
    expect(screen.getByText('150.25')).toBeInTheDocument();
    expect(screen.getByText('78.5%')).toBeInTheDocument();
    expect(screen.getByText(previewPayload.warnings[0])).toBeInTheDocument();
    expect(screen.getByText(previewPayload.explanations[0])).toBeInTheDocument();
    expect(screen.getByText(previewPayload.rawText)).toBeInTheDocument();
  });

  it('shows validation errors for unsupported formats and never calls the API', () => {
    renderPreviewPage();

    const input = screen.getByLabelText(/choose a file/i);
    const badFile = new File(['data'], 'malware.exe', { type: 'application/x-msdownload' });
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(screen.getByText(/unsupported format/i)).toBeInTheDocument();
    expect(previewDocument).not.toHaveBeenCalled();
  });
});
