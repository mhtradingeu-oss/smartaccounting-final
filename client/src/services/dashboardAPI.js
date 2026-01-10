import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const isDev = process.env.NODE_ENV === 'development';
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const logDev = () => {};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolveCurrency = (stats, invoiceStats) =>
  stats?.revenue?.currency || stats?.currency || invoiceStats?.latestInvoice?.currency || null;

const buildMetricsFromStats = (stats = {}, invoiceStats = {}) => {
  const currency = resolveCurrency(stats, invoiceStats);
  const metrics = [];
  const totalRevenue = toNumber(
    stats.totalRevenue ?? stats.revenue?.total ?? stats.revenue ?? invoiceStats.totalRevenue,
  );
  const totalExpenses = toNumber(stats.totalExpenses ?? stats.expenses?.total ?? stats.expenses);
  const netProfit = toNumber(stats.netProfit ?? stats.profit);
  const invoiceCount = toNumber(
    stats.invoiceCount ?? stats.invoices?.total ?? stats.invoicesCount ?? invoiceStats.invoiceCount,
  );
  const overdueInvoices = toNumber(stats.overdue ?? stats.invoices?.overdue);
  const activeUsers = toNumber(stats.users?.active ?? stats.usersCount);

  if (totalRevenue !== null) {
    metrics.push({
      id: 'total-revenue',
      label: 'Total revenue',
      value: totalRevenue,
      format: 'currency',
      currency,
      description: 'Paid invoice revenue',
      priority: 'primary',
    });
  }
  if (totalExpenses !== null) {
    metrics.push({
      id: 'total-expenses',
      label: 'Total expenses',
      value: totalExpenses,
      format: 'currency',
      currency,
      description: 'Booked expenses',
      priority: 'primary',
    });
  }
  if (netProfit !== null) {
    metrics.push({
      id: 'net-profit',
      label: 'Net profit',
      value: netProfit,
      format: 'currency',
      currency,
      description: 'Revenue minus expenses',
      priority: 'primary',
    });
  }
  if (invoiceCount !== null) {
    metrics.push({
      id: 'invoices-count',
      label: 'Invoices',
      value: invoiceCount,
      format: 'number',
      description: 'Total invoices',
      priority: 'primary',
    });
  }
  if (overdueInvoices !== null) {
    metrics.push({
      id: 'overdue-invoices',
      label: 'Overdue',
      value: overdueInvoices,
      format: 'number',
      description: 'Invoices past due',
      priority: 'secondary',
    });
  }
  if (activeUsers !== null) {
    metrics.push({
      id: 'active-users',
      label: 'Active users',
      value: activeUsers,
      format: 'number',
      description: 'Currently active team members',
      priority: 'secondary',
    });
  }
  return metrics;
};

const normalizeStatsPayload = (payload) => {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return { metrics: payload };
  }
  if (Array.isArray(payload.metrics)) {
    return payload;
  }
  if (Array.isArray(payload.data?.metrics)) {
    return payload.data;
  }
  if (Array.isArray(payload.data)) {
    return { metrics: payload.data };
  }

  const stats = payload.stats ?? payload.data?.stats ?? payload.data ?? payload;
  const invoiceStats =
    payload.invoiceStats ?? payload.data?.invoiceStats ?? payload.details ?? payload.data?.details;
  const monthlyData =
    payload.monthlyData ?? payload.data?.monthlyData ?? payload.monthly ?? payload.data?.monthly;

  const safeStats = stats && typeof stats === 'object' ? stats : {};
  const safeInvoiceStats = invoiceStats && typeof invoiceStats === 'object' ? invoiceStats : {};
  const metrics = buildMetricsFromStats(safeStats, safeInvoiceStats);
  const currency = resolveCurrency(safeStats, safeInvoiceStats);
  const normalized = {
    ...(safeStats && !Array.isArray(safeStats) ? safeStats : {}),
    companyId: payload.companyId ?? payload.data?.companyId ?? null,
    currency,
    metrics,
    monthlyData,
    statusBreakdown:
      safeInvoiceStats?.statusBreakdown ?? safeStats?.statusBreakdown ?? payload.statusBreakdown ?? null,
    latestInvoice:
      safeInvoiceStats?.latestInvoice ?? safeStats?.latestInvoice ?? payload.latestInvoice ?? null,
    invoiceCount:
      safeStats?.invoiceCount ?? safeStats?.invoices?.total ?? safeInvoiceStats?.invoiceCount ?? null,
    totalRevenue:
      safeStats?.totalRevenue ?? safeStats?.revenue?.total ?? safeInvoiceStats?.totalRevenue ?? null,
  };

  if (!metrics.length && !normalized.statusBreakdown && !normalized.latestInvoice && !monthlyData) {
    return null;
  }

  return normalized;
};

export const dashboardAPI = {
  inFlight: {},
  cache: {},
  _fetchCount: {},
  async getStats(options = {}) {
    const { force = false, cooldownMs, companyId } = options;
    const cacheKey = companyId ? String(companyId) : 'default';

    if (force) {
      delete this.cache[cacheKey];
    }

    if (!force && Object.prototype.hasOwnProperty.call(this.cache, cacheKey)) {
      logDev('cache hit');
      return Promise.resolve({ data: this.cache[cacheKey] });
    }

    if (this.inFlight[cacheKey]) {
      logDev('reusing in-flight request');
      return this.inFlight[cacheKey];
    }

    const fetchPromise = (async () => {
      if (isDev) {
        this._fetchCount[cacheKey] = (this._fetchCount[cacheKey] || 0) + 1;
        logDev(`fetch #${this._fetchCount[cacheKey]}`);
      }

      try {
        const response = await api.get('/dashboard/stats', {
          headers: companyId ? { 'X-Company-Id': companyId } : undefined,
        });
        const payload = response.data || {};
        const normalized = normalizeStatsPayload(payload);
        if (!normalized) {
          if (isDemoMode()) {
            const demoMetrics = buildMetricsFromStats(DEMO_DATA.dashboard);
            this.cache[cacheKey] =
              normalizeStatsPayload({ metrics: demoMetrics }) || { metrics: demoMetrics };
            return { data: this.cache[cacheKey] };
          }
          this.cache[cacheKey] = null;
          return { data: null };
        }
        this.cache[cacheKey] = normalized;
        return { data: normalized };
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
        this.inFlight[cacheKey] = null;
      }
    })();

    this.inFlight[cacheKey] = fetchPromise;
    return fetchPromise;
  },
  clearCache(companyId) {
    if (companyId) {
      const cacheKey = String(companyId);
      delete this.cache[cacheKey];
      delete this.inFlight[cacheKey];
      delete this._fetchCount[cacheKey];
      logDev(`cache cleared for ${cacheKey}`);
      return;
    }
    this.cache = {};
    this.inFlight = {};
    this._fetchCount = {};
    logDev('cache cleared');
  },
};

export default dashboardAPI;
