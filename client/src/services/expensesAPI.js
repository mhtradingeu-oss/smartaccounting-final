import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const isDev = process.env.NODE_ENV === 'development';
const logDev = (...args) => {
  if (isDev) {
     
    console.log('[expensesAPI]', ...args);
  }
};

export const normalizeExpenseStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending' || normalized === 'draft') {
    return 'pending';
  }
  if (normalized === 'booked' || normalized === 'posted') {
    return 'booked';
  }
  if (normalized === 'archived') {
    return 'archived';
  }
  return 'pending';
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeExpense = (expense = {}) => {
  const grossAmount = toNumber(expense.grossAmount ?? expense.amount);
  const netAmount = toNumber(expense.netAmount, grossAmount);
  const vatAmount = toNumber(expense.vatAmount);
  const vendor = expense.vendor ?? expense.vendorName ?? '';

  return {
    ...expense,
    id: expense.id,
    date: expense.date ?? expense.expenseDate ?? null,
    expenseDate: expense.expenseDate ?? expense.date ?? null,
    description: expense.description ?? '',
    vendor,
    vendorName: expense.vendorName ?? vendor,
    category: expense.category ?? '',
    netAmount,
    vatRate: toNumber(expense.vatRate),
    vatAmount,
    grossAmount,
    amount: toNumber(expense.amount ?? grossAmount, grossAmount),
    currency: expense.currency ?? 'EUR',
    status: normalizeExpenseStatus(expense.status),
    source: expense.source ?? 'manual',
    attachments: Array.isArray(expense.attachments) ? expense.attachments : [],
  };
};

const normalizeListPayload = (response) => {
  const payload = response?.data ?? response;
  const expenses = Array.isArray(payload)
    ? payload
    : payload?.expenses ?? payload?.data?.expenses ?? payload?.data;
  if (!Array.isArray(expenses)) {
    throw new Error('Unexpected expenses response shape.');
  }
  return expenses.map(normalizeExpense);
};

const buildCreatePayload = (data = {}) => {
  const netAmount = toNumber(data.netAmount ?? data.amount);
  const vatRate = toNumber(data.vatRate);
  const vatAmount = toNumber(data.vatAmount, +(netAmount * vatRate).toFixed(2));
  const grossAmount = toNumber(data.grossAmount, +(netAmount + vatAmount).toFixed(2));

  return {
    companyId: data.companyId,
    createdByUserId: data.createdByUserId,
    expenseDate: data.expenseDate ?? data.date,
    currency: 'EUR',
    status: 'pending',
    source: data.source ?? 'manual',
    category: data.category,
    description: data.description,
    netAmount,
    vatAmount,
    grossAmount,
    vatRate,
    vendorName: data.vendorName ?? data.vendor,
    ...(data.notes ? { notes: data.notes } : {}),
    ...(Array.isArray(data.attachments) ? { attachments: data.attachments } : {}),
  };
};

export const expensesAPI = {
  inFlight: {},
  cache: {},
  _fetchCount: {},
  async list({ companyId, force = false } = {}) {
    if (!companyId) {
      throw new Error('companyId is required to list expenses');
    }

    if (force) {
      this.clearCache(companyId);
    }

    if (!force && this.cache[companyId]) {
      logDev(`cache hit for ${companyId}`);
      return Promise.resolve(this.cache[companyId]);
    }

    if (this.inFlight[companyId]) {
      logDev(`reusing in-flight for ${companyId}`);
      return this.inFlight[companyId];
    }

    const fetchPromise = (async () => {
      if (isDev) {
        this._fetchCount[companyId] = (this._fetchCount[companyId] || 0) + 1;
        logDev(`fetch #${this._fetchCount[companyId]} for ${companyId}`);
      }

      try {
        const response = await api.get('/expenses', {
          headers: { 'X-Company-Id': companyId },
        });
        const normalized = normalizeListPayload(response);
        if (isDemoMode() && normalized.length === 0) {
          this.cache[companyId] = (DEMO_DATA.expenses ?? []).map((expense, index) => ({
            id: expense.id ?? `demo-expense-${index + 1}`,
            number: expense.number ?? `EXP-DEMO-${index + 1}`,
            date: expense.date ?? new Date().toISOString().split('T')[0],
            expenseDate: expense.expenseDate ?? expense.date ?? new Date().toISOString().split('T')[0],
            description: expense.description ?? 'Demo expense',
            amount: expense.amount ?? expense.grossAmount ?? 0,
            grossAmount: expense.grossAmount ?? expense.amount ?? 0,
            netAmount: expense.netAmount ?? expense.amount ?? 0,
            vatRate: expense.vatRate ?? 0,
            vatAmount: expense.vatAmount ?? 0,
            currency: expense.currency ?? 'EUR',
            vendor: expense.vendor ?? expense.vendorName ?? 'Demo Vendor',
            vendorName: expense.vendorName ?? expense.vendor ?? 'Demo Vendor',
            category: expense.category ?? 'general',
            status: expense.status ?? 'pending',
            source: expense.source ?? 'manual',
            attachments: expense.attachments ?? [],
          })).map(normalizeExpense);
        } else {
          this.cache[companyId] = normalized;
        }
        return this.cache[companyId];
      } catch (err) {
        if (err?.response?.status === 429) {
          const rateLimitError = new Error('Too many requests. Please try again shortly.');
          rateLimitError.status = 429;
          rateLimitError.rateLimited = true;
          throw rateLimitError;
        }
        throw err;
      } finally {
        this.inFlight[companyId] = null;
      }
    })();

    this.inFlight[companyId] = fetchPromise;
    return fetchPromise;
  },
  async create(data) {
    const companyId = data?.companyId;
    const response = await api.post('/expenses', buildCreatePayload(data), {
      headers: companyId ? { 'X-Company-Id': companyId } : undefined,
    });
    if (companyId) {
      this.clearCache(companyId);
    }
    return response.data;
  },
  async get(id, { companyId } = {}) {
    const response = await api.get(`/expenses/${id}`, {
      headers: companyId ? { 'X-Company-Id': companyId } : undefined,
    });
    const payload = response.data ?? response;
    const expense = payload?.expense ?? payload?.data?.expense ?? payload;
    return { ...payload, expense: normalizeExpense(expense) };
  },
  async updateStatus(id, status, { companyId } = {}) {
    const response = await api.patch(
      `/expenses/${id}/status`,
      { status: normalizeExpenseStatus(status) },
      {
        headers: companyId ? { 'X-Company-Id': companyId } : undefined,
      },
    );
    if (companyId) {
      this.clearCache(companyId);
    }
    return response.data;
  },
  clearCache(companyId) {
    if (companyId) {
      delete this.cache[companyId];
      delete this.inFlight[companyId];
      delete this._fetchCount[companyId];
    }
  },
};

export default expensesAPI;
