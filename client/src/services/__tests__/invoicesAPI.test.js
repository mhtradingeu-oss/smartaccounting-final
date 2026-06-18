import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoicesAPI } from '../invoicesAPI';
import api from '../api';

vi.mock('../api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../lib/demoMode', () => ({
  isDemoMode: () => false,
  DEMO_DATA: { invoices: [] },
}));

describe('invoicesAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes backend invoices into the frontend invoice contract', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        invoices: [
          {
            id: 1,
            status: 'PARTIALLY_PAID',
            currency: 'eur',
            items: [
              {
                description: 'Consulting',
                quantity: '2.00',
                unitPrice: '100.00',
                vatRate: '0.1900',
                lineNet: '200.00',
                lineVat: '38.00',
                lineGross: '238.00',
              },
            ],
          },
        ],
      },
    });

    const result = await invoicesAPI.list({ companyId: 7 });

    expect(api.get).toHaveBeenCalledWith('/invoices', {
      params: {},
      headers: { 'X-Company-Id': 7 },
    });
    expect(result[0]).toMatchObject({
      status: 'partially_paid',
      currency: 'EUR',
      items: [
        expect.objectContaining({
          vatRate: '19',
          netAmount: '200.00',
          vatAmount: '38.00',
          grossAmount: '238.00',
        }),
      ],
    });
  });

  it('maps create payload VAT and status values for the backend', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true, invoice: { id: 2, status: 'DRAFT', currency: 'EUR', items: [] } },
    });

    await invoicesAPI.create({
      companyId: 7,
      clientName: 'Client GmbH',
      date: '2026-06-18',
      dueDate: '2026-06-25',
      currency: 'EUR',
      status: 'draft',
      items: [{ description: 'Service', quantity: '1', unitPrice: '100', vatRate: '19' }],
    });

    expect(api.post).toHaveBeenCalledWith(
      '/invoices',
      expect.objectContaining({
        status: 'DRAFT',
        items: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 100,
            vatRate: 0.19,
          },
        ],
      }),
      { headers: { 'X-Company-Id': 7 } },
    );
  });

  it('uses the status endpoint with only mapped status for status-only updates', async () => {
    api.patch.mockResolvedValueOnce({
      data: { success: true, invoice: { id: 3, status: 'SENT', currency: 'EUR', items: [] } },
    });

    const result = await invoicesAPI.update(3, { companyId: 7, status: 'issued' });

    expect(api.patch).toHaveBeenCalledWith(
      '/invoices/3/status',
      { status: 'SENT' },
      { headers: { 'X-Company-Id': 7 } },
    );
    expect(api.put).not.toHaveBeenCalled();
    expect(result.status).toBe('issued');
  });

  it('does not send derived totals in draft update payloads', async () => {
    api.put.mockResolvedValueOnce({
      data: { success: true, invoice: { id: 4, status: 'DRAFT', currency: 'EUR', items: [] } },
    });

    await invoicesAPI.update(4, {
      companyId: 7,
      clientName: 'Updated Client',
      subtotal: '100.00',
      total: '119.00',
      amount: '119.00',
      items: [{ description: 'Service', quantity: 1, unitPrice: 100, vatRate: 19 }],
    });

    const payload = api.put.mock.calls[0][1];
    expect(payload).not.toHaveProperty('subtotal');
    expect(payload).not.toHaveProperty('total');
    expect(payload).not.toHaveProperty('amount');
    expect(payload.items[0].vatRate).toBe(0.19);
  });
});
