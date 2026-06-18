import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const BACKEND_TO_UI_STATUS = {
  DRAFT: 'draft',
  SENT: 'issued',
  ISSUED: 'issued',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  PARTIALLY_PAID: 'partially_paid',
};

const UI_TO_BACKEND_STATUS = {
  draft: 'DRAFT',
  issued: 'SENT',
  paid: 'PAID',
  overdue: 'OVERDUE',
  cancelled: 'CANCELLED',
  partially_paid: 'PARTIALLY_PAID',
};

const normalizeStatusFromBackend = (status) => {
  if (!status) {
    return 'draft';
  }
  const value = String(status).trim();
  return BACKEND_TO_UI_STATUS[value.toUpperCase()] || value.toLowerCase();
};

const mapStatusToBackend = (status) => {
  if (!status) {
    return undefined;
  }
  const value = String(status).trim();
  const uiValue = value.toLowerCase();
  if (UI_TO_BACKEND_STATUS[uiValue]) {
    return UI_TO_BACKEND_STATUS[uiValue];
  }
  const backendValue = value.toUpperCase();
  return BACKEND_TO_UI_STATUS[backendValue] ? backendValue : undefined;
};

const normalizeVatRateFromBackend = (value) => {
  const rate = Number(value);
  if (!Number.isFinite(rate)) {
    return '';
  }
  const percentage = rate <= 1 ? rate * 100 : rate;
  return Number(percentage.toFixed(4)).toString();
};

const normalizeInvoiceItem = (item = {}) => ({
  ...item,
  description: item.description || '',
  quantity: item.quantity ?? 1,
  unitPrice: item.unitPrice ?? item.price ?? '',
  vatRate: normalizeVatRateFromBackend(item.vatRate),
  netAmount: item.netAmount ?? item.lineNet ?? '',
  vatAmount: item.vatAmount ?? item.lineVat ?? '',
  grossAmount: item.grossAmount ?? item.lineGross ?? '',
});

const normalizeAuditEntry = (entry = {}) => ({
  ...entry,
  action: entry.action || 'invoice_update',
  timestamp: entry.timestamp || entry.createdAt || null,
  oldValues: entry.oldValues || null,
  newValues: entry.newValues || null,
  user: entry.user || entry.userName || entry.userId || 'System',
});

const normalizeInvoice = (invoice = {}) => ({
  ...invoice,
  status: normalizeStatusFromBackend(invoice.status),
  currency: (invoice.currency || 'EUR').toUpperCase(),
  items: Array.isArray(invoice.items) ? invoice.items.map(normalizeInvoiceItem) : [],
  attachments: Array.isArray(invoice.attachments) ? invoice.attachments : [],
});

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

  if (response.data?.invoice) {
    return response.data.invoice;
  }

  return response;
};

const normalizeDemoInvoices = (items = []) =>
  items.map((invoice, index) => {
    const rawStatus = invoice.status ?? (index === 0 ? 'draft' : 'issued');
    const status = rawStatus === 'unpaid' ? 'issued' : rawStatus;
    return normalizeInvoice({
      id: invoice.id ?? `demo-invoice-${index + 1}`,
      invoiceNumber: invoice.invoiceNumber ?? invoice.number ?? `INV-DEMO-${index + 1}`,
      clientName: invoice.clientName ?? invoice.client ?? 'Demo Client',
      date: invoice.date ?? invoice.issueDate ?? new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate ?? invoice.date ?? new Date().toISOString().split('T')[0],
      total: invoice.total ?? invoice.amount ?? 0,
      currency: invoice.currency ?? 'EUR',
      status,
      items: invoice.items || [],
    });
  });

const buildHeaders = (companyId) => (companyId ? { 'X-Company-Id': companyId } : undefined);

const normalizeVatRateToBackend = (value) => {
  const rate = Number(value);
  if (!Number.isFinite(rate)) {
    return 0.19;
  }
  return rate > 1 ? rate / 100 : rate;
};

const isStatusOnlyPayload = (invoiceData = {}) => {
  const keys = Object.keys(invoiceData).filter((key) => key !== 'companyId');
  return keys.length === 1 && keys[0] === 'status';
};

const mapInvoicePayloadToBackend = (invoiceData = {}, { requireItems = false } = {}) => {
  const today = new Date().toISOString().split('T')[0];
  const mapped = {
    currency: invoiceData.currency || 'EUR',
    date: invoiceData.date || invoiceData.invoiceDate || today,
    dueDate: invoiceData.dueDate || invoiceData.dueDateDate || today,
    clientName: invoiceData.clientName || invoiceData.customerName,
    ...(Array.isArray(invoiceData.items) || requireItems
      ? {
          items: Array.isArray(invoiceData.items)
            ? invoiceData.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                vatRate: normalizeVatRateToBackend(item.vatRate),
              }))
            : [],
        }
      : {}),
    ...(invoiceData.attachments ? { attachments: invoiceData.attachments } : {}),
    ...(Object.prototype.hasOwnProperty.call(invoiceData, 'notes')
      ? { notes: invoiceData.notes }
      : {}),
  };

  const backendStatus = mapStatusToBackend(invoiceData.status);
  if (backendStatus) {
    mapped.status = backendStatus;
  }

  return mapped;
};

export const invoicesAPI = {
  list: async (params = {}) => {
    const { companyId, ...query } = params;
    const response = await api.get('/invoices', {
      params: query,
      headers: buildHeaders(companyId),
    });
    const data = extractPayload(response.data);
    if (!Array.isArray(data)) {
      throw new Error('Unexpected invoices response shape.');
    }
    if (isDemoMode() && data.length === 0) {
      return normalizeDemoInvoices(DEMO_DATA.invoices);
    }
    return data.map(normalizeInvoice);
  },

  get: async (invoiceId, params = {}) => {
    const { companyId } = params;
    const response = await api.get(`/invoices/${invoiceId}`, {
      headers: buildHeaders(companyId),
    });
    return normalizeInvoice(extractPayload(response.data));
  },

  create: async (invoiceData) => {
    const { companyId } = invoiceData || {};
    const response = await api.post(
      '/invoices',
      mapInvoicePayloadToBackend(invoiceData, { requireItems: true }),
      { headers: buildHeaders(companyId) },
    );
    return normalizeInvoice(extractPayload(response.data));
  },

  update: async (invoiceId, invoiceData) => {
    const { companyId } = invoiceData || {};
    const headers = buildHeaders(companyId);
    if (isStatusOnlyPayload(invoiceData)) {
      const response = await api.patch(
        `/invoices/${invoiceId}/status`,
        { status: mapStatusToBackend(invoiceData.status) },
        { headers },
      );
      return normalizeInvoice(extractPayload(response.data));
    }
    const response = await api.put(
      `/invoices/${invoiceId}`,
      mapInvoicePayloadToBackend(invoiceData),
      { headers },
    );
    return normalizeInvoice(extractPayload(response.data));
  },

  auditLog: async (invoiceId, params = {}) => {
    const { companyId } = params;
    const response = await api.get(`/invoices/${invoiceId}/audit-log`, {
      headers: buildHeaders(companyId),
    });
    const data = response.data?.auditLog || response.data?.logs || response.data?.data || [];
    return Array.isArray(data) ? data.map(normalizeAuditEntry) : [];
  },

  previewImport: async ({ file, companyId }) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/invoice-import/preview', formData, {
      headers: {
        ...buildHeaders(companyId),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  commitImport: async ({ file, companyId }) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/invoice-import/commit', formData, {
      headers: {
        ...buildHeaders(companyId),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default invoicesAPI;
