
import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const extractPayload = (response) => {
  if (!response) {
    return [];
  }

  if (response.invoices) {
    return response.invoices;
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (response.invoice) {
    return response.invoice;
  }

  if (response.data?.invoices) {
    return response.data.invoices;
  }

  return response;
};

const normalizeDemoInvoices = (items = []) =>
  items.map((invoice, index) => {
    const rawStatus = invoice.status ?? (index === 0 ? 'draft' : 'issued');
    const status = rawStatus === 'unpaid' ? 'issued' : rawStatus;
    return {
      id: invoice.id ?? `demo-invoice-${index + 1}`,
      invoiceNumber: invoice.invoiceNumber ?? invoice.number ?? `INV-DEMO-${index + 1}`,
      clientName: invoice.clientName ?? invoice.client ?? 'Demo Client',
      date: invoice.date ?? invoice.issueDate ?? new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate ?? invoice.date ?? new Date().toISOString().split('T')[0],
      total: invoice.total ?? invoice.amount ?? 0,
      currency: invoice.currency ?? 'EUR',
      status,
    };
  });

export const invoicesAPI = {
  list: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    const data = extractPayload(response.data);
    if (!Array.isArray(data)) {
      throw new Error('Unexpected invoices response shape.');
    }
    if (isDemoMode() && data.length === 0) {
      return normalizeDemoInvoices(DEMO_DATA.invoices);
    }
    return data;
  },
  create: async (invoiceData) => {
    const response = await api.post('/invoices', invoiceData);
    return extractPayload(response.data);
  },
  update: async (invoiceId, invoiceData) => {
    const response = await api.put(`/invoices/${invoiceId}`, invoiceData);
    return extractPayload(response.data);
  },
};

export default invoicesAPI;
