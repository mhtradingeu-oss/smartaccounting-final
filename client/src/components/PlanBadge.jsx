import { logger } from '../lib/logger';
import { getSafeErrorMeta } from '../lib/errorMeta';

import { useState, useEffect } from 'react';
import api from '../services/api';
import { resolvePlanLabel, usePlanCatalog } from '../hooks/usePlanCatalog';

const PlanBadge = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { planMap } = usePlanCatalog();

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/stripe/subscription');
      setSubscriptionStatus(response.data?.subscription || response.data);
    } catch (error) {
      logger.error('Failed to fetch subscription status', getSafeErrorMeta(error));
    } finally {
      setLoading(false);
    }
  };

  if (loading || !subscriptionStatus) {
    // Visually hidden for accessibility, avoids blank render
    return <span className="sr-only">Loading plan badge...</span>;
  }

  const getBadgeColor = (status, plan) => {
    if (status === 'active') {
      switch (plan) {
        case 'basic':
          return 'bg-blue-100 text-blue-800';
        case 'pro':
          return 'bg-purple-100 text-purple-800';
        case 'enterprise':
          return 'bg-gold-100 text-gold-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
    return 'bg-red-100 text-red-800';
  };

  const getPlanName = (plan) => resolvePlanLabel(plan, planMap) || 'Plan unavailable';

  return (
    <div className="inline-flex items-center">
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeColor(subscriptionStatus.status || subscriptionStatus.subscriptionStatus, subscriptionStatus.plan)}`}
      >
        {(subscriptionStatus.status || subscriptionStatus.subscriptionStatus) === 'active'
          ? getPlanName(subscriptionStatus.plan)
          : 'Inactive'}
      </span>
    </div>
  );
};

export default PlanBadge;
