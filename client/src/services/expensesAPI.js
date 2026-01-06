import api from './api';

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
        const response = await api.get(`/expenses?companyId=${companyId}`);
        this.cache[companyId] = response.data?.expenses ?? [];
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
