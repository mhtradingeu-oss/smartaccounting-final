
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

  return response;
};

export const invoicesAPI = {
  list: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    const data = extractPayload(response.data);
    if (isDemoMode() && (!data || (Array.isArray(data) && data.length === 0))) {
      return DEMO_DATA.invoices;
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
