import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/dashboardAPI';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole } from '../lib/permissions';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isReadOnly = isReadOnlyRole(user?.role);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);

  // Demo Data (Admin only)
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(null);
  const [demoSuccess, setDemoSuccess] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const result = await dashboardAPI.getStats();

      if (result?.disabled) {
        setDisabled(true);
        setDashboardData(null);
      } else {
        setDashboardData(result?.data || null);
      }
    } catch (err) {
      // Production: ignore error visually, show empty/disabled state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLoadDemoData = async () => {
    setDemoLoading(true);
    setDemoError(null);
    setDemoSuccess(false);

    try {
      const res = await fetch('/api/admin/demo-data/load', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load demo data');
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
    return (
      <div className="flex justify-center items-center h-64">
        <Skeleton variant="card" className="w-full max-w-2xl h-64" />
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">{t('dashboard.not_available')}</p>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || [];

  return (
    <>
      {/* Admin Demo Button */}
      {user?.role === 'admin' && (
        <div className="flex justify-end mb-4">
          <Button variant="outlined" color="warning" onClick={() => setShowDemoModal(true)}>
            Load Demo Data
          </Button>
        </div>
      )}

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Load Demo Data</h2>
            <p className="text-sm mb-4">
              This will generate demo invoices, expenses and bank statements.
            </p>

            {demoError && <div className="text-red-600 text-sm mb-2">{demoError}</div>}
            {demoSuccess && (
              <div className="text-green-600 text-sm mb-2">Demo data loaded successfully.</div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowDemoModal(false)}
                disabled={demoLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleLoadDemoData}
                disabled={demoLoading || demoSuccess}
              >
                {demoLoading ? 'Loading…' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="space-y-8">
        {isReadOnly && <ReadOnlyBanner message="You have read-only access. Editing is disabled." />}

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div key={metric.id} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-xl font-bold">{metric.value}</span>
              </div>
              <span className="block text-xs text-gray-500 mt-1">{metric.description}</span>
            </div>
          ))}
        </div>

        {/* Placeholder Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex flex-col items-center justify-center h-64">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500">{t('dashboard.chart_coming_soon')}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
