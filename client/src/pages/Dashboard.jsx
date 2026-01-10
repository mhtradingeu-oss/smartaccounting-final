import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { dashboardAPI } from '../services/dashboardAPI';
import api, { formatApiError } from '../services/api';
import { Button } from '../components/ui/Button';
import Card from '../components/Card';
import { Modal } from '../components/ui/Modal';
import { PageEmptyState, PageErrorState } from '../components/ui/PageStates';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole } from '../lib/permissions';
import { formatDate } from '../lib/utils/formatting';

const statusLabel = (status = '') =>
  status
    .toString()
    .split(/[\s_-]/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');

const formatNumber = (value, options = {}) => {
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  });
  return formatter.format(value);
};

const formatCurrency = (value, currency) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

const formatMetricValue = (metric) => {
  const numericValue = Number(metric.value);
  if (!Number.isFinite(numericValue)) {
    return '--';
  }
  if (metric.format === 'currency' && metric.currency) {
    return formatCurrency(numericValue, metric.currency);
  }
  if (metric.format === 'percent') {
    return `${formatNumber(numericValue, { maximumFractionDigits: 2 })}%`;
  }
  if (metric.format === 'number') {
    return formatNumber(numericValue);
  }
  return formatNumber(numericValue, { maximumFractionDigits: 2 });
};

const DashboardSkeleton = () => (
  <div className="space-y-10">
    <div className="space-y-3">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-4 w-72" />
    </div>

    <section className="space-y-4">
      <Skeleton className="h-6 w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`metric-skeleton-${index}`}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-4">
      <Skeleton className="h-6 w-28" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`trend-skeleton-${index}`}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`detail-skeleton-${index}`}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </section>
  </div>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  // Only show demo UI if explicitly enabled
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const isReadOnly = isReadOnlyRole(user?.role);
  const canViewInvestorDashboard = ['auditor', 'accountant', 'admin'].includes(user?.role);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimitMessage, setRateLimitMessage] = useState(null);
  const [cooldownExpiresAt, setCooldownExpiresAt] = useState(null);
  const [timeNow, setTimeNow] = useState(Date.now());

  // Demo Data (Admin only)
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(null);
  const [demoSuccess, setDemoSuccess] = useState(false);

  const fetchDashboardData = useCallback(
    async (options = {}) => {
      if (!activeCompany?.id) {
        return;
      }
      setLoading(true);
      setError(null);
      setRateLimitMessage(null);
      setCooldownExpiresAt(null);

      try {
        const result = await dashboardAPI.getStats({
          ...options,
          companyId: activeCompany.id,
        });

        if (result?.disabled) {
          setDisabled(true);
          setDashboardData(null);
        } else {
          setDisabled(false);
          setDashboardData(result?.data || null);
        }
      } catch (err) {
        setDisabled(false);
        setDashboardData(null);
        if (err?.rateLimited || err?.status === 429) {
          setRateLimitMessage(err.message || 'Too many requests. Please try again shortly.');
          setTimeNow(Date.now());
          setCooldownExpiresAt(Date.now() + (err.cooldownMs || 60000));
          return;
        }
        setError(formatApiError(err, 'Unable to load dashboard metrics.'));
      } finally {
        setLoading(false);
      }
    },
    [activeCompany?.id],
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!activeCompany?.id) {
      return;
    }
    dashboardAPI.clearCache(activeCompany.id);
    fetchDashboardData({ force: true });
  }, [fetchDashboardData, activeCompany?.id]);

  useEffect(() => {
    if (!cooldownExpiresAt) {
      return undefined;
    }
    const tick = () => {
      setTimeNow(Date.now());
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [cooldownExpiresAt]);

  useEffect(() => {
    if (cooldownExpiresAt && timeNow >= cooldownExpiresAt) {
      setCooldownExpiresAt(null);
      setRateLimitMessage(null);
    }
  }, [cooldownExpiresAt, timeNow]);

  const metrics = dashboardData?.metrics || [];
  const primaryMetrics = metrics.filter((metric) => metric.priority === 'primary');
  const secondaryMetrics = metrics.filter((metric) => metric.priority === 'secondary');
  const displayMetrics = primaryMetrics.length ? primaryMetrics : metrics;

  const monthlySeries = Array.isArray(dashboardData?.monthlyData)
    ? dashboardData.monthlyData
    : [];
  const trendSeries = monthlySeries.slice(-6);
  const maxRevenue = Math.max(...trendSeries.map((item) => Number(item.revenue) || 0), 0);
  const maxInvoices = Math.max(...trendSeries.map((item) => Number(item.invoices) || 0), 0);

  const statusEntries = useMemo(() => {
    const statusBreakdown = dashboardData?.statusBreakdown;
    if (!statusBreakdown) {
      return [];
    }
    return Object.entries(statusBreakdown)
      .map(([status, count]) => [status, Number(count) || 0])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [dashboardData?.statusBreakdown]);

  const latestInvoice = dashboardData?.latestInvoice;

  const hasMetrics = displayMetrics.length > 0;
  const hasTrends = trendSeries.some(
    (point) => (Number(point.revenue) || 0) > 0 || (Number(point.invoices) || 0) > 0,
  );
  const hasDetails = statusEntries.length > 0 || latestInvoice;

  const handleLoadDemoData = async () => {
    setDemoLoading(true);
    setDemoError(null);
    setDemoSuccess(false);

    try {
      const response = await api.post('/admin/demo-data/load');
      const data = response?.data || response;

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to load demo data');
      }

      setDemoSuccess(true);
      fetchDashboardData();
    } catch (err) {
      setDemoError(err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const cooldownRemaining = cooldownExpiresAt
    ? Math.max(0, Math.ceil((cooldownExpiresAt - timeNow) / 1000))
    : 0;

  if (!activeCompany) {
    return (
      <EmptyState
        title="Select a company to view the dashboard"
        description="Executive metrics are scoped to the active company. Choose a company to load live KPIs, trends, and details."
        action={
          <Button variant="primary" onClick={() => navigate('/companies')}>
            Select company
          </Button>
        }
      />
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <PageErrorState onRetry={fetchDashboardData} />;
  }

  if (rateLimitMessage) {
    return (
      <div
        className="mx-auto max-w-md space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-amber-900 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="text-lg font-semibold">Rate limit reached</p>
        <p className="text-sm text-amber-900">{rateLimitMessage}</p>
        {cooldownRemaining > 0 && (
          <p className="text-xs text-amber-700">
            Cooldown resets in {cooldownRemaining} second{cooldownRemaining !== 1 ? 's' : ''}
          </p>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={() => fetchDashboardData({ force: true })}
          disabled={cooldownRemaining > 0}
        >
          Retry now
        </Button>
      </div>
    );
  }

  if (disabled) {
    return <PageErrorState onRetry={fetchDashboardData} />;
  }

  if (!hasMetrics && !hasTrends && !hasDetails) {
    return (
      <PageEmptyState
        title="No live metrics yet"
        description="Create invoices or expenses to populate executive KPIs and trend insights."
        action={
          <Link to="/invoices">
            <Button variant="primary" size="small">
              {t('states.empty.action')}
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.dashboard')}</h1>
        <p className="text-sm text-gray-500">
          Executive view of cash flow, invoices, and operational activity for {activeCompany.name}.
        </p>
      </div>

      {isDemoMode && user?.role === 'admin' && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              variant="danger"
              size="md"
              className="font-bold shadow-sm border border-red-200 dark:border-red-700"
              onClick={() => setShowDemoModal(true)}
            >
              Load demo data
            </Button>
          </div>
          {showDemoModal && (
            <Modal
              open={showDemoModal}
              onClose={() => setShowDemoModal(false)}
              title="Load demo data"
              ariaLabel="Confirm loading demo data"
              className="max-w-md space-y-4"
            >
              <p className="text-base text-gray-600 dark:text-gray-300 mb-0">
                This will generate demo invoices, expenses, and bank statements for this company.
              </p>

              {demoError && (
                <div className="text-red-600 text-sm" role="alert" aria-live="assertive">
                  {demoError}
                </div>
              )}
              {demoSuccess && (
                <div className="text-green-600 text-sm" role="status" aria-live="polite">
                  Demo data loaded successfully.
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="secondary"
                  size="md"
                  className="border border-gray-300 dark:border-gray-700"
                  onClick={() => setShowDemoModal(false)}
                  disabled={demoLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  className="font-bold shadow-sm border border-red-200 dark:border-red-700"
                  onClick={handleLoadDemoData}
                  disabled={demoLoading || demoSuccess}
                >
                  {demoLoading ? 'Loading...' : 'Confirm'}
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}

      <div className="space-y-12">
        {isReadOnly && (
          <ReadOnlyBanner mode="Viewer" message={t('states.read_only.dashboard_notice')} />
        )}

        {canViewInvestorDashboard && (
          <Card className="border border-dashed border-blue-200 bg-white/80 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                  Auditor tools
                </p>
                <h2 className="text-xl font-semibold text-gray-900">Investor dashboard</h2>
                <p className="text-sm text-gray-600">
                  Jump into the auditor-friendly KPI surface without leaving the main workspace.
                </p>
              </div>
              <Link to="/investor-dashboard">
                <Button variant="primary" size="md">
                  Open investor dashboard
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Executive KPIs</h2>
          {displayMetrics.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayMetrics.map((metric) => {
                const formattedValue = formatMetricValue(metric);
                return (
                  <div
                    key={metric.id}
                    className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium text-gray-700">
                        {metric.label}
                      </span>
                      <span
                        className="text-2xl font-bold text-primary-700"
                        data-raw={metric.value}
                        data-format={metric.format || 'number'}
                        data-currency={metric.currency || undefined}
                      >
                        {formattedValue}
                      </span>
                    </div>
                    {metric.description && (
                      <span className="block text-xs text-gray-500 mt-2">
                        {metric.description}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No KPI data available yet.</p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Revenue trend</h3>
                <span className="text-xs text-gray-500">Last 6 months</span>
              </div>
              {hasTrends ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-2 h-24">
                    {trendSeries.map((point) => {
                      const height = maxRevenue > 0 ? Math.max(6, (point.revenue / maxRevenue) * 96) : 6;
                      return (
                        <div key={`rev-${point.month}`} className="flex-1">
                          <div
                            className="rounded bg-primary-200"
                            style={{ height: `${height}px` }}
                            title={formatNumber(point.revenue, { maximumFractionDigits: 2 })}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    {trendSeries.map((point) => (
                      <span key={`rev-label-${point.month}`}>{point.month}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center text-gray-500">
                  <ChartBarIcon className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm">No revenue trend data yet.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Invoice volume</h3>
                <span className="text-xs text-gray-500">Last 6 months</span>
              </div>
              {hasTrends ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-2 h-24">
                    {trendSeries.map((point) => {
                      const height = maxInvoices > 0 ? Math.max(6, (point.invoices / maxInvoices) * 96) : 6;
                      return (
                        <div key={`inv-${point.month}`} className="flex-1">
                          <div
                            className="rounded bg-amber-200"
                            style={{ height: `${height}px` }}
                            title={formatNumber(point.invoices)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    {trendSeries.map((point) => (
                      <span key={`inv-label-${point.month}`}>{point.month}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center text-gray-500">
                  <ChartBarIcon className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm">No invoice trend data yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Details</h2>
          <div
            className={`grid grid-cols-1 ${
              secondaryMetrics.length ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
            } gap-6`}
          >
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice status mix</h3>
              {statusEntries.length ? (
                <div className="space-y-3">
                  {statusEntries.map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{statusLabel(status)}</span>
                      <span className="font-semibold text-gray-900">{formatNumber(count)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No invoice status data yet.</p>
              )}
            </div>

            {secondaryMetrics.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Operational signals</h3>
                <div className="space-y-3">
                  {secondaryMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{metric.label}</span>
                      <span
                        className="font-semibold text-gray-900"
                        data-raw={metric.value}
                        data-format={metric.format || 'number'}
                        data-currency={metric.currency || undefined}
                      >
                        {formatMetricValue(metric)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Latest invoice</h3>
              {latestInvoice ? (
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Invoice</span>
                    <span className="font-semibold text-gray-900">
                      {latestInvoice.invoiceNumber || latestInvoice.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="font-semibold text-gray-900">
                      {statusLabel(latestInvoice.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Amount</span>
                    <span className="font-semibold text-gray-900">
                      {Number.isFinite(Number(latestInvoice.amount))
                        ? latestInvoice.currency
                          ? formatCurrency(latestInvoice.amount, latestInvoice.currency)
                          : formatNumber(latestInvoice.amount, { maximumFractionDigits: 2 })
                        : '--'}
                    </span>
                  </div>
                  {latestInvoice.createdAt && (
                    <div className="flex items-center justify-between">
                      <span>Created</span>
                      <span className="font-semibold text-gray-900">
                        {formatDate(latestInvoice.createdAt)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No invoice activity yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
