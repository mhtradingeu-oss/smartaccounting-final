import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InvoiceForm from '../components/invoices/InvoiceForm';

const depthExceededLogged = (consoleErrorMock) =>
  consoleErrorMock.mock.calls.some((call) =>
    call.some((arg) => typeof arg === 'string' && arg.includes('Maximum update depth exceeded')),
  );

describe('InvoiceForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders create defaults without depth warnings', () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<InvoiceForm submitLabel="Create invoice" />);
      expect(screen.getByDisplayValue('EUR')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect(depthExceededLogged(consoleErrorMock)).toBe(false);
    } finally {
      consoleErrorMock.mockRestore();
    }
  });

  it('applies edit initial values and handles prop updates without depth warnings', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    const initialValues = {
      invoiceNumber: 'INV-123',
      clientName: 'Example Co',
      date: '2024-01-01',
      dueDate: '2024-01-15',
      currency: 'gbp',
      subtotal: 200,
      total: 238,
      items: [
        {
          description: 'Consulting',
          quantity: 1,
          unitPrice: '200',
          vatRate: '19',
          netAmount: '200',
          vatAmount: '38',
          grossAmount: '238',
        },
      ],
    };

    try {
      const { rerender } = render(<InvoiceForm initialValues={initialValues} />);
      expect(screen.getByDisplayValue('INV-123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Example Co')).toBeInTheDocument();
      expect(screen.getByDisplayValue('GBP')).toBeInTheDocument();

      const updatedValues = { ...initialValues, clientName: 'Example Co GmbH' };
      rerender(<InvoiceForm initialValues={updatedValues} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Example Co GmbH')).toBeInTheDocument();
      });
      expect(depthExceededLogged(consoleErrorMock)).toBe(false);
    } finally {
      consoleErrorMock.mockRestore();
    }
  });
});
