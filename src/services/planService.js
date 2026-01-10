const {
  PLAN_ORDER,
  PLAN_ALIASES,
  PLAN_CATALOG,
  FEATURE_MATRIX,
  PRICING_COPY,
} = require('../config/plans');

const DEFAULT_PLAN_ID = 'pro';

const normalizePlanId = (value) => {
  if (!value) {
    return DEFAULT_PLAN_ID;
  }
  const normalized = String(value).trim().toLowerCase();
  return PLAN_ALIASES[normalized] || DEFAULT_PLAN_ID;
};

const resolvePlanIdForCompany = (company) => {
  if (!company) {
    return DEFAULT_PLAN_ID;
  }
  const status = String(company.subscriptionStatus || '').toLowerCase();
  if (status === 'demo') {
    return 'demo';
  }
  return normalizePlanId(company.subscriptionPlan);
};

const getPlan = (planId) => PLAN_CATALOG[planId] || PLAN_CATALOG[DEFAULT_PLAN_ID];

const getFeatureAvailability = (planId, featureKey) => {
  const plan = getPlan(planId);
  return Boolean(plan?.features?.[featureKey]);
};

const formatPlanForPublic = (plan) => ({
  id: plan.id,
  name: plan.name,
  badge: plan.badge,
  description: plan.description,
  price: plan.price,
  billingUnit: plan.billingUnit,
  included: plan.included,
  trial: plan.trial,
  highlights: plan.highlights,
  limits: plan.limits,
  features: plan.features,
  cta: plan.cta,
});

const buildFeatureMatrix = () =>
  FEATURE_MATRIX.map((row) => ({
    key: row.key,
    label: row.label,
    availability: PLAN_ORDER.map((planId) => Boolean(PLAN_CATALOG[planId]?.features?.[row.key])),
  }));

const getPublicPlansPayload = () => ({
  plans: PLAN_ORDER.map((planId) => formatPlanForPublic(PLAN_CATALOG[planId])),
  featureMatrix: buildFeatureMatrix(),
  copy: PRICING_COPY,
});

const getSystemPlansFallback = () =>
  PLAN_ORDER.filter((planId) => planId !== 'demo').map((planId) => {
    const plan = PLAN_CATALOG[planId];
    const monthlyCents = plan.price?.monthlyCents;
    return {
      id: plan.id,
      name: plan.name,
      price:
        typeof monthlyCents === 'number'
          ? new Intl.NumberFormat('de-DE', {
              style: 'currency',
              currency: plan.price.currency || 'EUR',
              maximumFractionDigits: 0,
            }).format(monthlyCents / 100)
          : 'Individuell',
      interval: typeof monthlyCents === 'number' ? 'mo' : null,
    };
  });

module.exports = {
  DEFAULT_PLAN_ID,
  normalizePlanId,
  resolvePlanIdForCompany,
  getPlan,
  getFeatureAvailability,
  getPublicPlansPayload,
  getSystemPlansFallback,
};
