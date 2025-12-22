import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardAPI } from '../services/dashboardAPI';
import { formatApiError } from '../services/api';
import { logger } from '../lib/logger';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/EmptyState';
import { Button } from '../components/ui/Button';
import PermissionGuard from '../components/PermissionGuard';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { isReadOnlyRole } from '../lib/permissions';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  CurrencyEuroIcon as CurrencyEuroIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
} from '@heroicons/react/24/solid';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  const fetchDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setDisabled(false);
    try {
      const result = await dashboardAPI.getStats();
      if (result.disabled) {
        setDisabled(true);
        setDashboardData(null);
        setError(null);
      } else if (!result.data || Object.keys(result.data).length === 0) {
        setDashboardData(null);
        setError(null);
      } else {
        setDashboardData(result.data);
        setError(null);
      }
    } catch (err) {
      // Only set error for true network/API failures (not 501, not empty)
      logger.error('Failed to fetch dashboard data:', err);
      setError(formatApiError(err, t('dashboard.error_loading')));
      setDashboardData(null);
      setDisabled(false);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe]);

  // 1. Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton variant="card" className="w-full max-w-2xl h-64" />
      </div>
    );
  }

  // 2. Disabled (501)
  if (disabled) {
    return (
      <EmptyState
        icon={ExclamationTriangleIcon}
        title={t('dashboard.coming_soon')}
        description={t('dashboard.coming_soon_desc')}
      />
    );
  }

  // 3. Error (real failure)
  if (error) {
    return (
      <EmptyState
        icon={ExclamationTriangleIcon}
        title={t('dashboard.error_title')}
        description={error.message}
        action={error.retryable && (
          <Button onClick={fetchDashboardData} variant="primary">
            {t('common.retry')}
          </Button>
        )}
      />
    );
  }

  // 4. Empty
  if (!dashboardData) {
    return (
      <EmptyState
        icon={ExclamationTriangleIcon}
        title={t('dashboard.empty_title')}
        description={t('dashboard.empty_message')}
      />
    );
  }

  // 5. Success
  const stats = dashboardData || {};
  const recentActivities = dashboardData?.recentActivities || [];

  // Read-only detection
  const isReadOnly = user && isReadOnlyRole(user.role);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const keyMetrics = [
    {
      title: t('dashboard.total_revenue'),
      value: formatCurrency(stats.totalRevenue || 0),
      change: formatPercentage(stats.monthlyGrowth || 0),
      trend: 'up',
      icon: CurrencyEuroIconSolid,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      color: 'emerald',
      description: 'This month',
    },
    {
      title: t('dashboard.net_profit'),
      value: formatCurrency(stats.netProfit || 0),
      change: formatPercentage(stats.quarterlyGrowth || 0),
      trend: 'up',
      icon: ArrowUpIcon,
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      color: 'blue',
      description: 'Profit margin: ' + (stats.profitMargin || 0).toFixed(1) + '%',
    },
    {
      title: t('dashboard.active_invoices'),
      value: (stats.invoiceCount || 0).toString(),
      change: `${stats.pendingInvoices || 0} pending`,
      trend: stats.overdue > 0 ? 'warning' : 'neutral',
      icon: DocumentTextIconSolid,
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      color: 'purple',
      description: `${stats.overdue || 0} overdue`,
    },
    {
      title: t('dashboard.avg_invoice'),
      value: formatCurrency(stats.averageInvoice || 0),
      change: '+5.2%',
      trend: 'up',
      icon: ChartBarIcon,
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      color: 'orange',
      description: 'vs last month',
    },
  ];

  const quickActions = [
    {
      title: t('dashboard.create_invoice'),
      description: t('dashboard.create_invoice_desc'),
      icon: PlusIcon,
      href: '/invoices/create',
      color: 'primary',
      featured: true,
    },
    {
      title: t('dashboard.upload_receipt'),
      description: t('dashboard.upload_receipt_desc'),
      icon: CloudArrowUpIcon,
      href: '/invoices/upload',
      color: 'secondary',
    },
    {
      title: t('dashboard.tax_reports'),
      description: t('dashboard.tax_reports_desc'),
      icon: DocumentChartBarIcon,
      href: '/german-tax-reports',
      color: 'success',
    },
    {
      title: t('dashboard.analytics'),
      description: t('dashboard.analytics_desc'),
      icon: ChartBarIcon,
      href: '/analytics',
      color: 'warning',
    },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'invoice':
        return DocumentTextIcon;
      case 'payment':
        return BanknotesIcon;
      case 'tax':
        return DocumentChartBarIcon;
      case 'upload':
        return CloudArrowUpIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
      case 'warning':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
      case 'error':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {isReadOnly && (
        <ReadOnlyBanner message="You have read-only access. Editing is disabled." />
      )}
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.welcome_back')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('dashboard.overview_subtitle', { 
              date: formatDate(new Date().toISOString()), 
            })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="input text-sm py-2"
          >
            <option value="week">{t('dashboard.this_week')}</option>
            <option value="month">{t('dashboard.this_month')}</option>
            <option value="quarter">{t('dashboard.this_quarter')}</option>
            <option value="year">{t('dashboard.this_year')}</option>
          </select>
          <PermissionGuard action="export" role={user?.role}>
            <button className="btn-secondary">
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {t('dashboard.export')}
            </button>
          </PermissionGuard>
          <PermissionGuard action="create" role={user?.role}>
            <button className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('dashboard.new_invoice')}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 hover:shadow-medium transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${metric.iconBg}`}>
                  <metric.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {metric.value}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {metric.trend === 'up' ? (
                    <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
                  ) : metric.trend === 'down' ? (
                    <ArrowDownIcon className="h-4 w-4 text-red-500" />
                  ) : null}
                <span className={`text-sm font-medium ${
                  metric.trend === 'up' ? 'text-emerald-600' : 
                  metric.trend === 'warning' ? 'text-amber-600' : 'text-gray-500'
                }`}>
                  {metric.change}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {metric.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart Section */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('dashboard.revenue_analytics')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('dashboard.monthly_overview_desc')}
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 px-3 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20">
                Revenue
              </button>
              <button className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 px-3 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                Profit
              </button>
            </div>
          </div>

          {/* Chart Placeholder - Enhanced */}
          <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-pattern opacity-5"></div>
            <div className="text-center relative z-10">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {t('dashboard.chart_coming_soon')}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Chart.js integration in progress
              </p>
            </div>
          </div>
        </div>

        {/* Tax Compliance & Status */}
        <div className="space-y-6">
          {/* Tax Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('dashboard.tax_compliance')}
              </h3>
              {taxSummary ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-emerald-600 font-medium">
                    {taxSummary.complianceScore}% compliant
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Not available in v0.1
                </span>
              )}
            </div>

            {taxSummary ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('dashboard.next_vat_deadline')}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatDate(taxSummary.nextDeadline || new Date().toISOString())}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(taxSummary.vatOwed || 0)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">VAT due</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(taxSummary.incomeTax || 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Income Tax
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {taxSummary.currentQuarter}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Current Period
                    </div>
                  </div>
                </div>

                <PermissionGuard action="create" role={user?.role}>
                  <button className="w-full btn-primary">
                    <DocumentChartBarIcon className="h-4 w-4 mr-2" />
                    {t('dashboard.generate_tax_report')}
                  </button>
                </PermissionGuard>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Not available in v0.1
              </div>
            )}
          </div>

          {/* Upload Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('dashboard.document_processing')}
            </h3>

            {uploadStats ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Processed</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {uploadStats.processed || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">In Queue</span>
                    <span className="font-medium text-amber-600">
                      {uploadStats.processingQueue || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Recent Uploads</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {uploadStats.recentUploads || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <PermissionGuard action="create" role={user?.role}>
                    <button className="w-full btn-secondary">
                      <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                      {t('dashboard.upload_documents')}
                    </button>
                  </PermissionGuard>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Not available in v0.1
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard.quick_actions')}
          </h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
            {t('dashboard.customize')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <PermissionGuard key={index} action="create" role={user?.role}>
              <a
                href={action.href}
                className={`group block p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:shadow-medium ${
                  action.featured 
                    ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
                tabIndex={0}
                aria-disabled={isReadOnly}
                style={isReadOnly ? { pointerEvents: 'none', opacity: 0.5 } : {}}
              >
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-lg ${
                    action.featured 
                      ? 'bg-primary-100 dark:bg-primary-900/40'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <action.icon className={`h-5 w-5 ${
                      action.featured 
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  {action.featured && (
                    <span className="ml-auto text-xs bg-primary-600 text-white px-2 py-1 rounded-full">
                      Featured
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {action.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {action.description}
                </p>
              </a>
            </PermissionGuard>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard.recent_activities')}
          </h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center">
            <EyeIcon className="h-4 w-4 mr-1" />
            {t('dashboard.view_all')}
          </button>
        </div>

        <div className="space-y-4">
          {recentActivities.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <div className={`p-2 rounded-lg ${getActivityColor(activity.status)}`}>
                  <ActivityIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.time}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' :
                    activity.status === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            );
          })}
          {recentActivities.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Not available in v0.1
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
