import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const isDev = process.env.NODE_ENV === 'development';
const logDev = (...args) => {
  if (isDev) {
     
    console.log('[companiesAPI]', ...args);
  }
};

export const companiesAPI = {
  inFlight: null,
  cache: null,
  _fetchCount: 0,
  async list(options = {}) {
    const { force = false } = options;

    if (!force && this.cache) {
      if (isDev) {
         
        console.log('[companiesAPI] cache hit');
      }
      return Promise.resolve(this.cache);
    }

    if (this.inFlight) {
      logDev('reusing in-flight request');
      return this.inFlight;
    }

    const fetchPromise = (async () => {
      if (isDev) {
        this._fetchCount += 1;
         
        console.log(`[companiesAPI] fetch #${this._fetchCount}`);
      }

      try {
        const res = await api.get('/companies');
        const payload = res.data;
        if (isDemoMode() && (!payload || (Array.isArray(payload) && payload.length === 0))) {
          this.cache = DEMO_DATA.companies;
        } else {
          this.cache = payload;
        }
        return this.cache;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 429) {
          if (isDev) {
             
            console.warn('[companiesAPI] rate limit (429) - skipping retries');
          }
          const rateLimitError = new Error('Too many requests. Please try again shortly.');
          rateLimitError.status = 429;
          throw rateLimitError;
        }
        if (status === 401) {
          if (isDev) {
             
            console.warn('[companiesAPI] unauthorized (401) - not retrying');
          }
          throw err;
        }

        if (isDev) {
           
          console.error('[companiesAPI] fetch error', err);
        }
        throw err;
      } finally {
        this.inFlight = null;
      }
    })();

    this.inFlight = fetchPromise;
    return fetchPromise;
  },
  clearCache() {
    this.cache = null;
    this.inFlight = null;
    this._fetchCount = 0;
    logDev('cache cleared');
  },
  async update(companyId, payload) {
    const res = await api.put(`/companies/${companyId}`, payload);
    return res.data;
  },
  // Add more company-related API methods as needed
};
