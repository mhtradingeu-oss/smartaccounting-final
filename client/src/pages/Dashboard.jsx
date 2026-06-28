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

const QUICK_ACTIONS = [
  {
    title: 'Create invoice',
    description: 'Issue compliant invoices and keep revenue, VAT, and audit signals current.',
    to: '/invoices/create',
    tag: 'Revenue',
  },
  {
    title: 'Add expense',
    description: 'Record costs with VAT awareness and keep profitability accurate.',
    to: '/expenses/create',
    tag: 'Costs',
  },
  {
    title: 'Import bank statement',
    description: 'Upload transactions for reconciliation, matching, and audit readiness.',
    to: '/bank-statements/import',
    tag: 'Bank',
  },
  {
    title: 'Ask AI Assistant',
    description: 'Ask for read-only, company-scoped analysis of KPIs, VAT gaps, and next actions.',
    to: '/ai-assistant',
    tag: 'AI',
  },
];

const DashboardSkeleton = () => (
  <div className="space-y-10">
    <div className="space-y-3">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-4 w-72" />
    </div>

    <section className="space-y-4">
      <Skeleton className="h-6 w-36" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
  const hasAccountingTruth =
    dashboardData?.financialOverview?.source === 'posted_journal_entries' &&
    dashboardData?.financialOverview?.status !== 'unavailable';
  const vatSummary = dashboardData?.financialOverview?.vatSummary || null;
  const hasVatSummary =
    hasAccountingTruth &&
    vatSummary &&
    ['inputVat', 'outputVat', 'netVatPayable'].some((key) =>
      Number.isFinite(Number(vatSummary[key])),
    );
  const auditReadiness = dashboardData?.auditReadiness || null;
  const auditSignals = Array.isArray(auditReadiness?.signals) ? auditReadiness.signals : [];
  const hasAuditReadiness = auditReadiness && auditSignals.length > 0;

  const hasMetrics = displayMetrics.length > 0;
  const hasTrends = trendSeries.some(
    (point) => (Number(point.revenue) || 0) > 0 || (Number(point.invoices) || 0) > 0,
  );
  const hasDetails = statusEntries.length > 0 || latestInvoice || hasVatSummary || hasAuditReadiness;

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
    return <PageErrorState message={error?.message} onRetry={() => fetchDashboardData({ force: true })} />;
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
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">
              Accounting command center
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white">
              {t('navigation.dashboard')}
            </h1>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-200">
                    What needs attention today
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-950 dark:text-white">
                    Accounting health: live company KPIs, VAT, audit signals, and invoice activity.
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-200">
                    AI-safe assistant
                  </p>
                  <p className="mt-1 text-sm text-blue-950 dark:text-blue-100">
                    Read-only, company-scoped analysis with review required before accounting changes.
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-4 dark:border-violet-900/60 dark:bg-violet-950/30">
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-200">
                    Compliance cockpit
                  </p>
                  <p className="mt-1 text-sm text-violet-950 dark:text-violet-100">
                    VAT, audit trail, bank reconciliation, and export readiness stay visible.
                  </p>
                </div>
              </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              Live financial overview for {activeCompany.name}: revenue, expenses, invoice status,
              bank activity, and operational signals in one place.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-200">
              Company scope
            </div>
            <div className="mt-2 font-semibold">{activeCompany.name}</div>
            <div className="mt-4 grid gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/80 px-3 py-1 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                AI-safe · audit-aware
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-700 dark:bg-blue-950/60 dark:text-emerald-200">
                Accounting truth enabled
              </span>
            </div>
          </div>
        </div>
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

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick actions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Continue the most important accounting workflows from the dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {action.title}
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                    {action.tag}
                  </span>
                </div>
                  <p className="mt-3 min-h-12 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  {action.description}
                </p>
                <span className="mt-4 inline-flex text-xs font-semibold text-blue-700 group-hover:text-blue-600 dark:text-blue-300">
                  Continue →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Executive KPIs</h2>
            {hasAccountingTruth && (
              <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                Accounting truth: posted journal entries
              </span>
            )}
          </div>
          {displayMetrics.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {displayMetrics.map((metric) => {
                const formattedValue = formatMetricValue(metric);
                return (
                  <div
                    key={metric.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {metric.label}
                      </span>
                      <span
                        className="text-3xl font-extrabold tracking-tight text-blue-700 dark:text-blue-300"
                        data-raw={metric.value}
                        data-format={metric.format || 'number'}
                        data-currency={metric.currency || undefined}
                      >
                        {formattedValue}
                      </span>
                    </div>
                    {metric.description && (
                      <span className="mt-4 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {metric.description}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No KPI data available yet.</p>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Trends</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Revenue trend</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">Last 6 months</span>
              </div>
              {hasTrends ? (
                <div className="space-y-4">
                  <div className="flex h-28 items-end gap-2 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/60">
                    {trendSeries.map((point) => {
                      const height = maxRevenue > 0 ? Math.max(6, (point.revenue / maxRevenue) * 96) : 6;
                      return (
                        <div key={`rev-${point.month}`} className="flex-1">
                          <div
                            className="rounded-t-lg bg-blue-300 dark:bg-blue-700"
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
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
                  <ChartBarIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-700" />
                  <p className="text-sm font-medium">No revenue trend data yet.</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Invoice volume</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">Last 6 months</span>
              </div>
              {hasTrends ? (
                <div className="space-y-4">
                  <div className="flex h-28 items-end gap-2 rounded-2xl bg-gray-50 p-3 dark:bg-gray-900/60">
                    {trendSeries.map((point) => {
                      const height = maxInvoices > 0 ? Math.max(6, (point.invoices / maxInvoices) * 96) : 6;
                      return (
                        <div key={`inv-${point.month}`} className="flex-1">
                          <div
                            className="rounded-t-lg bg-amber-300 dark:bg-amber-700"
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
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
                  <ChartBarIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-700" />
                  <p className="text-sm font-medium">No invoice trend data yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Details</h2>
          <div
            className={`grid grid-cols-1 ${
              secondaryMetrics.length ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
            } gap-6`}
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Invoice status mix</h3>
              {statusEntries.length ? (
                <div className="space-y-3">
                  {statusEntries.map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{statusLabel(status)}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(count)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No invoice status data yet.</p>
              )}
            </div>

            {secondaryMetrics.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Operational signals</h3>
                <div className="space-y-3">
                  {secondaryMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{metric.label}</span>
                      <span
                        className="font-semibold text-gray-900 dark:text-white"
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

            {hasAuditReadiness && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Audit readiness
                  </h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                    {auditReadiness.status || 'review'}
                  </span>
                </div>
                <div className="space-y-3">
                  {auditSignals.slice(0, 4).map((signal) => (
                    <div key={signal.id || signal.title} className="rounded-lg bg-white/70 p-3 dark:bg-amber-950/40">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-amber-950 dark:text-white">
                          {signal.title}
                        </p>
                        <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-200">
                          {signal.severity || 'info'}
                        </span>
                      </div>
                      {signal.description && (
                        <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200">
                          {signal.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
                  Source: deterministic dashboard rules
                </p>
              </div>
            )}

            {hasVatSummary && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <h3 className="mb-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  VAT / Compliance summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 dark:text-emerald-200">Input VAT</span>
                    <span className="font-semibold text-emerald-950 dark:text-white">
                      {formatCurrency(Number(vatSummary.inputVat) || 0, dashboardData.currency || 'EUR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 dark:text-emerald-200">Output VAT</span>
                    <span className="font-semibold text-emerald-950 dark:text-white">
                      {formatCurrency(Number(vatSummary.outputVat) || 0, dashboardData.currency || 'EUR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-emerald-200 pt-3 dark:border-emerald-900/60">
                    <span className="text-emerald-700 dark:text-emerald-200">
                      {vatSummary.isPayable ? 'Net VAT payable' : 'Net VAT refundable'}
                    </span>
                    <span className="font-semibold text-emerald-950 dark:text-white">
                      {formatCurrency(Math.abs(Number(vatSummary.netVatPayable) || 0), dashboardData.currency || 'EUR')}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-300">
                  Source: posted journal entries
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Latest invoice</h3>
              {latestInvoice ? (
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Invoice</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {latestInvoice.invoiceNumber || latestInvoice.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {statusLabel(latestInvoice.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Amount</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
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
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatDate(latestInvoice.createdAt)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No invoice activity yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
