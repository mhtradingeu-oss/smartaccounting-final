import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const isDev = process.env.NODE_ENV === 'development';
const logDev = (...args) => {
  if (isDev) {
     
    console.log('[expensesAPI]', ...args);
  }
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
        const payload = response.data ?? response;
        const normalized = Array.isArray(payload)
          ? payload
          : payload?.expenses ?? payload?.data?.expenses;
        if (!Array.isArray(normalized)) {
          throw new Error('Unexpected expenses response shape.');
        }
        if (isDemoMode() && normalized.length === 0) {
          this.cache[companyId] = (DEMO_DATA.expenses ?? []).map((expense, index) => ({
            id: expense.id ?? `demo-expense-${index + 1}`,
            number: expense.number ?? `EXP-DEMO-${index + 1}`,
            date: expense.date ?? new Date().toISOString().split('T')[0],
            description: expense.description ?? 'Demo expense',
            amount: expense.amount ?? 0,
            currency: expense.currency ?? 'EUR',
            vendor: expense.vendor ?? 'Demo Vendor',
            category: expense.category ?? 'general',
            status: expense.status ?? 'draft',
          }));
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
    const response = await api.post('/expenses', data);
    if (data?.companyId) {
      this.clearCache(data.companyId);
    }
    return response.data;
  },
  async get(id) {
    const response = await api.get(`/expenses/${id}`);
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
