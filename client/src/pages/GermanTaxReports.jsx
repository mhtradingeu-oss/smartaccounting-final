import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import {
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { APP_VERSION } from '../lib/constants';
import { useCompany } from '../context/CompanyContext';
import api, { formatApiError } from '../services/api';

const GermanTaxReports = () => {
  // All hooks must be called before any conditional return
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const [selectedPeriod, setSelectedPeriod] = useState('current-quarter');
  const [reportType, setReportType] = useState('ust');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [availability, setAvailability] = useState({ status: 'idle', detail: null });

  // Data that depends on hooks can be defined after
  const reportTypes = [
    {
      id: 'ust',
      name: t('ustReport', { defaultValue: 'UStVA' }),
      description: t('ustReportDescription', { defaultValue: 'Value-added tax return' }),
    },
    {
      id: 'euer',
      name: t('euerReport', { defaultValue: 'EÜR' }),
      description: t('euerReportDescription', { defaultValue: 'Income-expenditure report' }),
    },
    {
      id: 'gewst',
      name: t('gewstReport', { defaultValue: 'GewSt' }),
      description: t('gewstReportDescription', { defaultValue: 'Trade tax declaration' }),
    },
  ];

  const periods = [
    { id: 'current-quarter', name: t('currentQuarter', { defaultValue: 'Current quarter' }) },
    { id: 'last-quarter', name: t('lastQuarter', { defaultValue: 'Previous quarter' }) },
    { id: 'current-year', name: t('currentYear', { defaultValue: 'Current year' }) },
    { id: 'last-year', name: t('lastYear', { defaultValue: 'Previous year' }) },
    { id: 'custom', name: t('customPeriod', { defaultValue: 'Custom period' }) },
  ];

  useEffect(() => {
    if (!activeCompany) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const checkFeature = async () => {
      setAvailability({ status: 'checking', detail: null });
      try {
        await api.get('/german-tax/status', { signal: controller.signal });
        if (!isCancelled) {
          setAvailability({ status: 'available', detail: null });
        }
      } catch (fetchError) {
        if (isCancelled) {
          return;
        }

        if (fetchError.name === 'CanceledError' || fetchError.code === 'ERR_CANCELED') {
          return;
        }

        if (
          fetchError.response?.status === 501 &&
          fetchError.response.data?.status === 'disabled'
        ) {
          const version = fetchError.response.data?.version || APP_VERSION;
          const feature = fetchError.response.data?.feature || 'VAT/tax reporting';
          setAvailability({
            status: 'disabled',
            detail: {
              feature,
              version,
              message: `German tax reporting (${feature}) is disabled in v${version}. This workflow will return once the compliance services ship in a future release.`,
            },
          });
        } else {
          setAvailability({
            status: 'error',
            detail: formatApiError(fetchError, 'Unable to reach global tax reporting services.'),
          });
        }
      }
    };

    checkFeature();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [activeCompany]);

  const actionDisabled = availability.status !== 'available';

  const renderStatusCallout = () => {
    if (availability.status === 'idle' || availability.status === 'available') {
      // Visually hidden for accessibility, avoids blank render
      return <div className="sr-only">No status callout</div>;
    }

    const statusDetail = availability.detail || {};
    const statusConfig = {
      checking: {
        title: 'Checking availability',
        description:
          'Verifying the German tax reporting service. No data is loaded until the backend is ready.',
        icon: <ChartBarIcon className="h-5 w-5" />,
        badge: 'bg-blue-50 text-blue-600',
      },
      disabled: {
        title: 'Not available yet',
        description: statusDetail.message || 'German tax reporting is disabled for this release.',
        icon: <ExclamationTriangleIcon className="h-5 w-5" />,
        badge: 'bg-yellow-50 text-yellow-600',
      },
      error: {
        title: 'Service unavailable',
        description:
          statusDetail.message ||
          'We cannot reach the tax service right now. Please try again later.',
        icon: <ExclamationTriangleIcon className="h-5 w-5" />,
        badge: 'bg-red-50 text-red-600',
      },
    };

    const config = statusConfig[availability.status] || statusConfig.error;

    return (
      <Card className="mb-6 border-0 shadow">
        <div className="flex items-start gap-4 p-6">
          <div className={`rounded-full p-2 ${config.badge}`}>{config.icon}</div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Feature status</p>
            <h2 className="text-lg font-semibold text-gray-900 mt-1">German tax reporting</h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{config.description}</p>
            {availability.status === 'checking' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <LoadingSpinner size="small" />
                <span>Validating backend availability...</span>
              </div>
            )}
            {(availability.status === 'disabled' || availability.status === 'error') && (
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                {statusDetail.feature && <p>Feature: {statusDetail.feature}</p>}
                <p>Version: v{statusDetail.version || APP_VERSION}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (!activeCompany) {
    return (
      <Layout>
        <div className="py-24">
          <EmptyState
            title="Select a company"
            description="German tax reporting is scoped to an active company. Choose or create one before returning to this page."
            action={
              <Button as={Link} to="/companies" variant="primary">
                Pick a company
              </Button>
            }
          />
        </div>
      </Layout>
    );
  }

  const selectedReport = reportTypes.find((type) => type.id === reportType);
  const selectedPeriodLabel = periods.find((period) => period.id === selectedPeriod)?.name;
  const tooltipText =
    availability.status === 'disabled'
      ? 'German tax reporting is disabled in v0.1 and will return in a later release.'
      : availability.status === 'checking'
        ? 'We are verifying availability with the backend.'
        : availability.status === 'error'
          ? 'Tax reporting is currently unavailable.'
          : undefined;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('germanTaxReports')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('germanTaxReportsDescription')}
          </p>
        </div>

        {renderStatusCallout()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('selectReportType')}
              </h3>
              <div className="space-y-3">
                {reportTypes.map((type) => (
                  <label
                    key={type.id}
                    className={`flex items-start space-x-3 rounded-lg border p-3 ${actionDisabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-transparent hover:border-blue-300'}`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={type.id}
                      checked={reportType === type.id}
                      onChange={(e) => setReportType(e.target.value)}
                      className="mt-1 text-blue-600"
                      disabled={actionDisabled}
                      title={tooltipText}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {type.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('selectPeriod')}
              </h3>
              <div className="space-y-3">
                {periods.map((period) => (
                  <label
                    key={period.id}
                    className={`flex items-center space-x-3 rounded-lg border p-3 ${actionDisabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-transparent hover:border-blue-300'}`}
                  >
                    <input
                      type="radio"
                      name="period"
                      value={period.id}
                      checked={selectedPeriod === period.id}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="text-blue-600"
                      disabled={actionDisabled}
                      title={tooltipText}
                    />
                    <span className="text-sm text-gray-900 dark:text-white">{period.name}</span>
                  </label>
                ))}
              </div>

              {selectedPeriod === 'custom' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('startDate')}
                    </label>
                    <input
                      type="date"
                      value={customRange.start}
                      onChange={(event) =>
                        setCustomRange((prev) => ({ ...prev, start: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                      disabled={actionDisabled}
                      title={tooltipText}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('endDate')}
                    </label>
                    <input
                      type="date"
                      value={customRange.end}
                      onChange={(event) =>
                        setCustomRange((prev) => ({ ...prev, end: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                      disabled={actionDisabled}
                      title={tooltipText}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('generateReport')}
              </h3>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {selectedReport?.name}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {selectedPeriodLabel}
                  </p>
                </div>

                <Button
                  type="button"
                  disabled={actionDisabled}
                  title={tooltipText}
                  className="w-full flex items-center justify-center"
                  aria-disabled={actionDisabled}
                  leftIcon={<DocumentTextIcon className="h-5 w-5" />}
                >
                  {t('generateReport')}
                </Button>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {t('reportFormats')}: PDF, XML (ELSTER)
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-6 space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('recentReports')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tax reports will populate here once German tax reporting is live. Nothing is stored or
              sent until the service is enabled.
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3 mt-1" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {t('complianceNotice')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('complianceNoticeText')}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default GermanTaxReports;
