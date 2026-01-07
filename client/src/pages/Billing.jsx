import { logger } from '../lib/logger';
import { getSafeErrorMeta } from '../lib/errorMeta';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FEATURE_FLAGS } from '../lib/constants';
import api from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import FeatureGate from '../components/FeatureGate';
import LoadingSpinner from '../components/LoadingSpinner';

const Billing = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const billingEnabled = FEATURE_FLAGS.STRIPE_BILLING.enabled;

  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!billingEnabled) {
      setLoading(false);
      return;
    }

    const fetchBillingData = async () => {
      try {
        const [statusResponse, historyResponse] = await Promise.all([
          api.get('/stripe/subscription'),
          api.get('/stripe/billing-history'),
        ]);

        setSubscriptionStatus(statusResponse.data?.subscription || statusResponse.data);
        setBillingHistory(historyResponse.data?.history || []);
        setError(null);
      } catch (err) {
        logger.error('Failed to load billing data', getSafeErrorMeta(err));
        setError('Billing data is unavailable right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [billingEnabled]);

  /* =========================
     EARLY RETURNS (RENDER)
     ========================= */

  if (!billingEnabled) {
    return (
      <FeatureGate
        enabled={billingEnabled}
        featureName="Stripe billing"
        description="Billing features are not available in this version. If you need access, please contact support."
        ctaLabel="View pricing plans"
        ctaPath="/pricing"
        help="The backend currently returns 501 for /api/stripe when the feature is off."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('billingTitle')}</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const fetchBillingData = async () => {
    try {
      const [statusResponse, historyResponse] = await Promise.all([
        api.get('/stripe/subscription'),
        api.get('/stripe/billing-history'),
      ]);

      setSubscriptionStatus(statusResponse.data?.subscription || statusResponse.data);
      setBillingHistory(historyResponse.data?.history || []);
      setError(null);
    } catch (err) {
      logger.error('Failed to load billing data', getSafeErrorMeta(err));
      setError('Billing data is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.',
      )
    ) {
      return;
    }

    setCancelLoading(true);
    try {
      await api.post('/stripe/cancel-subscription');
      await fetchBillingData();
      alert('Subscription will be canceled at the end of the current period.');
    } catch (error) {
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadInvoicePDF = async (invoice) => {
    try {
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, '_blank');
      } else if (invoice.invoiceUrl) {
        window.open(invoice.invoiceUrl, '_blank');
      } else {
        alert('PDF not available for this invoice');
      }
    } catch (error) {
      alert('Failed to download PDF. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      past_due: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
      incomplete: 'bg-yellow-100 text-yellow-800',
      trialing: 'bg-blue-100 text-blue-800',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {status?.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    const value = typeof amount === 'number' ? amount : Number(amount) || 0;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('billingTitle')}</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={fetchBillingData}>Retry</Button>
      </div>
    );
  }

  const statusValue = subscriptionStatus?.status || subscriptionStatus?.subscriptionStatus;

  /* =========================
     MAIN RENDER
     ========================= */

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage your company’s subscription, plan, and billing history.
      </p>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('currentSubscription')}</h2>

            {statusValue === 'none' ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">{t('noActiveSubscription')}</p>
                <Button onClick={() => navigate('/pricing')}>{t('choosePlanButton')}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  {getStatusBadge(statusValue)}
                </div>

                {subscriptionStatus.plan && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Plan</span>
                    <span className="text-sm text-gray-900 capitalize">
                      {subscriptionStatus.plan}
                    </span>
                  </div>
                )}

                {subscriptionStatus.currentPeriodEnd && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">
                      {subscriptionStatus.cancelAtPeriodEnd ? 'Expires on' : 'Next billing'}
                    </span>
                    <span className="text-sm text-gray-900">
                      {formatDate(subscriptionStatus.currentPeriodEnd)}
                    </span>
                  </div>
                )}

                {statusValue === 'active' && user?.role === 'admin' && (
                  <div className="pt-4 border-t border-gray-200">
                    {subscriptionStatus.cancelAtPeriodEnd ? (
                      <p className="text-sm text-orange-600">
                        Subscription will be canceled at the end of the current period.
                      </p>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                      >
                        {cancelLoading ? <LoadingSpinner size="sm" /> : 'Cancel Subscription'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/pricing')}
              >
                View All Plans
              </Button>

              {statusValue === 'active' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full opacity-70 cursor-not-allowed"
                  disabled
                >
                  Update Payment Method (Coming soon)
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (billingHistory.length > 0) {
                    handleDownloadInvoicePDF(billingHistory[0]);
                  } else {
                    alert('No invoices available');
                  }
                }}
              >
                Download Latest Invoice
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>

          {billingHistory.length === 0 ? (
            <div className="text-gray-600 text-center py-4">
              <p className="font-semibold">No billing history yet</p>
              <p className="text-sm mt-1">
                Your invoices and payment records will appear here once you activate a subscription.
              </p>
              <Button className="mt-4" variant="primary" onClick={() => navigate('/pricing')}>
                Choose a plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Invoice
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billingHistory.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.number || invoice.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.created)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {invoice.invoiceUrl && (
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </a>
                          )}
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              PDF
                            </a>
                          )}
                          <button
                            onClick={() => handleDownloadInvoicePDF(invoice)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Billing;
