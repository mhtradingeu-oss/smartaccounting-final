import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const isDev = process.env.NODE_ENV === 'development';
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const logDev = () => {};

export const dashboardAPI = {
  inFlight: null,
  cache: null,
  _fetchCount: 0,
  async getStats(options = {}) {
    const { force = false, cooldownMs } = options;

    if (force) {
      this.cache = null;
    }

    if (!force && this.cache) {
      logDev('cache hit');
      return Promise.resolve({ data: this.cache });
    }

    if (this.inFlight) {
      logDev('reusing in-flight request');
      return this.inFlight;
    }

    const fetchPromise = (async () => {
      if (isDev) {
        this._fetchCount += 1;
        logDev(`fetch #${this._fetchCount}`);
      }

      try {
        const response = await api.get('/dashboard/stats');
        const payload = response.data || {};
        const stats = { ...payload };
        delete stats.success;
        if (Object.keys(stats).length === 0) {
          if (isDemoMode()) {
            this.cache = DEMO_DATA.dashboard;
            return { data: this.cache };
          }
          this.cache = null;
          return { data: null };
        }
        this.cache = stats;
        return { data: stats };
      } catch (err) {
        const status = err?.response?.status;
        if (status === 501) {
          return { disabled: true };
        }
        if (status === 429) {
          const rateLimitError = new Error('Too many requests. Please try again shortly.');
          rateLimitError.status = 429;
          rateLimitError.rateLimited = true;
          rateLimitError.cooldownMs = cooldownMs || RATE_LIMIT_COOLDOWN_MS;
          throw rateLimitError;
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
};

export default dashboardAPI;
