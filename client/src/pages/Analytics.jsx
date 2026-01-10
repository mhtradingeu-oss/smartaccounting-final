import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { dashboardAPI } from '../services/dashboardAPI';
import { formatApiError } from '../services/api';
import { logger } from '../lib/logger';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import PermissionGuard from '../components/PermissionGuard';
import { isReadOnlyRole } from '../lib/permissions';
import { getSafeErrorMeta } from '../lib/errorMeta';

const createInitialState = () => ({
  loading: false,
  disabled: false,
  error: null,
  data: null,
});

const disabledWidgets = [
  {
    title: 'Expense Overview',
    body: 'No dedicated expenses endpoint yet. Data not available until backend coverage expands.',
    icon: DocumentTextIcon,
  },
  {
    title: 'Revenue Trend',
    body: 'Monthly/quarterly trend data is still pending—no chart data is available.',
    icon: ChartBarIcon,
  },
  {
    title: 'Top Clients',
    body: 'Client leaderboard requires a backend aggregation endpoint before it can be shown.',
    icon: BuildingOfficeIcon,
  },
];

const totalInvoicesLabel = (count) => {
  if (!count) {
    return 'No invoices processed yet.';
  }
  return `${count} invoices processed to date.`;
};

const statusLabel = (status) => {
  if (!status) {
    return 'Unknown';
  }
  return status
    .split(/[\s_-]/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
};

const Analytics = () => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyticsState, setAnalyticsState] = useState(createInitialState);
  const companyId = activeCompany?.id;

  const fetchAnalytics = useCallback(async () => {
    if (!companyId) {
      return;
    }

    setAnalyticsState({
      loading: true,
      disabled: false,
      error: null,
      data: null,
    });

    try {
      const result = await dashboardAPI.getStats({ companyId });

      if (result.disabled) {
        setAnalyticsState({
          loading: false,
          disabled: true,
          error: null,
          data: null,
        });
        return;
      }

      const hasData = result.data && Object.keys(result.data).length > 0;
      setAnalyticsState({
        loading: false,
        disabled: false,
        error: null,
        data: hasData ? result.data : null,
      });
    } catch (error) {
      logger.error('Failed to load analytics data', getSafeErrorMeta(error));
      setAnalyticsState({
        loading: false,
        disabled: false,
        error: formatApiError(error, 'Unable to load analytics data.'),
        data: null,
      });
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const timer = setTimeout(() => {
      fetchAnalytics();
    }, 0);

    return () => clearTimeout(timer);
  }, [companyId, fetchAnalytics]);

  const { loading, disabled, error, data } = analyticsState;

  const statusEntries = useMemo(() => {
    if (!data?.statusBreakdown) {
      return [];
    }
    return Object.entries(data.statusBreakdown)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [data]);

  const paidCount = data?.statusBreakdown?.paid || 0;
  const invoiceCount = data?.invoiceCount || 0;
  const paidPercentage = invoiceCount > 0 ? Math.round((paidCount / invoiceCount) * 100) : 0;
  const unpaidCount = Math.max(invoiceCount - paidCount, 0);

  const latestInvoice = data?.latestInvoice;

  const renderStatusBadge = (status) => {
    const label = statusLabel(status);

    const colors = {
      paid: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50',
      pending: 'text-amber-700 bg-amber-100 dark:bg-amber-900/50',
      overdue: 'text-red-700 bg-red-100 dark:bg-red-900/50',
      default: 'text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-gray-800/60',
    };

    const className = colors[status?.toLowerCase?.()] || colors.default;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>
    );
  };

  const formatCurrency = (amount = 0) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (!activeCompany) {
    return (
      <EmptyState
        title="No company selected"
        description="Analytics data is scoped to the active company. Select one from the company menu before viewing dashboards."
        action={
          <Button variant="primary" onClick={() => navigate('/companies')}>
            Select Company
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="page-title">Business Analytics</h1>
          <p className="page-subtitle">Live insights for {activeCompany.name}</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 mt-3">Loading analytics data…</p>
        </div>
      </div>
    );
  }

  if (disabled) {
    return (
      <Card className="p-8 text-center my-8">
        <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Data not available yet
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          The analytics endpoint is currently disabled on the backend. Check back later once the
          feature is enabled.
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 space-y-4 my-8">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <p className="text-sm font-semibold text-red-600">{error.message}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error.retryable
            ? 'Try again or refresh later.'
            : 'This action cannot be retried automatically.'}
        </p>
        {error.retryable && (
          <button className="btn-primary" onClick={fetchAnalytics}>
            Retry
          </button>
        )}
      </Card>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No analytics data"
        description="There is no analytics data to display yet. Invoice data will appear here once documents are processed for this company."
        action={
          <Button variant="primary" onClick={fetchAnalytics}>
            Refresh
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode="Read-only" message={t('states.read_only.dashboard_notice')} />
      )}
      <>
        <div className="flex flex-col gap-2">
          <h1 className="page-title">Business Analytics</h1>
          <p className="page-subtitle">Live insights for {activeCompany.name}</p>
        </div>
        <div className="flex gap-4 mb-4">
          <PermissionGuard action="analytics:export" role={user?.role} showDisabled>
            <button className="btn-primary" onClick={() => window.print()} disabled>
              Export PDF
            </button>
          </PermissionGuard>
          <PermissionGuard action="analytics:export" role={user?.role} showDisabled>
            <button className="btn-secondary" onClick={fetchAnalytics}>
              Refresh
            </button>
          </PermissionGuard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Export Metadata Section */}
          <div className="card-elevated p-6 space-y-3 border border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-2 py-0.5 rounded bg-blue-200 text-blue-900 text-xs font-semibold">
                Export snapshot
              </span>
              <span className="inline-block px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs">
                Read-only
              </span>
            </div>
            <div className="text-xs text-gray-700 mb-1">
              Purpose: Prepared for advisor review (no submission)
            </div>
            <div className="text-xs text-gray-700 mb-1">
              Exported at: {new Date().toLocaleString()}
            </div>
            <div className="text-xs text-gray-700 mb-1">Version: v1.0</div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Revenue</p>
            <CurrencyEuroIcon className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="stat-value">{formatCurrency(data.totalRevenue || 0)}</p>
          <p className="text-sm text-gray-500">{totalInvoicesLabel(invoiceCount)}</p>
        </div>

        <div className="card-elevated p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Invoices</p>
            <DocumentTextIcon className="h-5 w-5 text-primary-500" />
          </div>
          <p className="stat-value">{invoiceCount || 0}</p>
          <p className="text-sm text-gray-500">
            {paidPercentage}% paid • {unpaidCount} unpaid
          </p>
        </div>

        <div className="card-elevated p-6 space-y-3">
          <p className="text-sm font-medium text-gray-500">Paid invoice ratio</p>
          <p className="stat-value">{paidPercentage}%</p>
          <p className="text-sm text-gray-500">
            {invoiceCount > 0
              ? `${paidCount} of ${invoiceCount} invoices marked as paid.`
              : 'No invoices recorded yet.'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 space-y-4">
            <h3 className="section-title mb-2">Invoice Status</h3>
            <div className="space-y-3">
              {statusEntries.length ? (
                statusEntries.map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between border border-dashed border-gray-200 rounded-xl px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {statusLabel(status)}
                      </span>
                      {renderStatusBadge(status)}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No invoice statuses are available for this period.
                </p>
              )}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="section-title mb-2">Latest Invoice</h3>
            {latestInvoice ? (
              <div className="space-y-2 text-sm">
                <div className="text-gray-500">Invoice #{latestInvoice.invoiceNumber}</div>
                <div className="text-2xl font-semibold">
                  {formatCurrency(latestInvoice.amount || 0)}
                </div>
                <p className="text-gray-500">
                  Status:{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {statusLabel(latestInvoice.status || 'unknown')}
                  </strong>
                </p>
                <Link
                  to={`/invoices/${latestInvoice.id}/edit`}
                  className="btn-ghost text-sm px-3 py-1 border rounded-lg inline-flex items-center gap-2"
                >
                  View invoice
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No invoices exist yet for this company.</p>
            )}
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="section-title mb-2">Unavailable metrics</h3>
            <p className="text-sm text-gray-500">
              The following analytics panels depend on backend endpoints that are not implemented
              yet.
            </p>
            <div className="space-y-3">
              {disabledWidgets.map((widget) => (
                <div
                  key={widget.title}
                  className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/40"
                >
                  <widget.icon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {widget.title}
                    </p>
                    <p className="text-xs text-gray-500">{widget.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    </div>
  );
};

export default Analytics;
