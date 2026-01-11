import { useEffect, useMemo, useState } from 'react';
import { fetchPublicPlans } from '../services/plansAPI';

let cachedPayload = null;
let pendingPromise = null;

const loadPublicPlans = async () => {
  if (cachedPayload) {
    return cachedPayload;
  }
  if (pendingPromise) {
    return pendingPromise;
  }
  pendingPromise = fetchPublicPlans()
    .then((data) => {
      cachedPayload = data;
      return cachedPayload;
    })
    .finally(() => {
      pendingPromise = null;
    });
  return pendingPromise;
};

export const usePlanCatalog = () => {
  const [payload, setPayload] = useState(cachedPayload);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!cachedPayload) {
      loadPublicPlans()
        .then((data) => {
          if (mounted) {
            setPayload(data);
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err);
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const planMap = useMemo(() => {
    const map = {};
    (payload?.plans || []).forEach((plan) => {
      if (plan?.id) {
        map[plan.id] = plan;
      }
    });
    return map;
  }, [payload]);

  return {
    payload,
    plans: payload?.plans || [],
    planMap,
    loading: !payload && !error,
    error,
  };
};

export const resolvePlanLabel = (planId, planMap) => {
  if (!planId) {
    return null;
  }
  return planMap?.[planId]?.name || String(planId);
};
