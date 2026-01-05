import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/dashboardAPI';
import api, { formatApiError } from '../services/api';
import { Button } from '../components/ui/Button';
import Card from '../components/Card';
import { Modal } from '../components/ui/Modal';
import { PageLoadingState, PageEmptyState, PageErrorState } from '../components/ui/PageStates';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole } from '../lib/permissions';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isReadOnly = isReadOnlyRole(user?.role);
  const canViewInvestorDashboard = ['auditor', 'accountant', 'admin'].includes(user?.role);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(null);

  // Demo Data (Admin only)
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(null);
  const [demoSuccess, setDemoSuccess] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await dashboardAPI.getStats();

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
      setError(formatApiError(err, 'Unable to load dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const metrics = dashboardData?.metrics || [];

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

  if (loading) {
    return <PageLoadingState />;
  }

  if (error) {
    return <PageErrorState onRetry={fetchDashboardData} />;
  }

  if (disabled) {
    return <PageErrorState onRetry={fetchDashboardData} />;
  }

  if (!metrics.length) {
    return (
      <PageEmptyState
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
    <>
      {/* Admin Demo Button */}
      {user?.role === 'admin' && (
        <div className="flex justify-end mb-4">
          <Button
            variant="danger"
            size="md"
            className="font-bold shadow-sm border border-red-200 dark:border-red-700"
            onClick={() => setShowDemoModal(true)}
          >
            Load Demo Data
          </Button>
        </div>
      )}

      {/* Demo Modal */}
      {showDemoModal && (
        <Modal
          open={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          title="Load Demo Data"
          ariaLabel="Confirm loading demo data"
          className="max-w-md space-y-4"
        >
          <p className="text-base text-gray-600 dark:text-gray-300 mb-0">
            This will generate demo invoices, expenses and bank statements.
          </p>

          {demoError && (
            <div
              className="text-red-600 text-sm"
              role="alert"
              aria-live="assertive"
            >
              {demoError}
            </div>
          )}
          {demoSuccess && (
            <div
              className="text-green-600 text-sm"
              role="status"
              aria-live="polite"
            >
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
              {demoLoading ? 'Loading…' : 'Confirm'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Dashboard Content */}
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

        {/* KPI Metrics */}
        <section>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
            Dashboard
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                    {metric.label}
                  </span>
                  <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                    {metric.value}
                  </span>
                </div>
                <span className="block text-xs text-gray-500 mt-2">{metric.description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Placeholder Chart */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 mt-8">
            Analytics (Coming Soon)
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center justify-center h-64">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-500">{t('dashboard.chart_coming_soon')}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Dashboard;
