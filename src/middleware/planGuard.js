const { Company } = require('../models');
const { resolvePlanIdForCompany, getPlan } = require('../services/planService');
const ApiError = require('../lib/errors/apiError');

const buildDeniedPayload = (plan, featureKey, upgradePath) => ({
  code: 'PLAN_RESTRICTED',
  message: 'Ihre aktuelle Planung erlaubt diese Funktion nicht.',
  feature: featureKey,
  plan: plan?.id,
  upgradePath,
});

const requirePlanFeature =
  (featureKey, options = {}) =>
  async (req, res, next) => {
    const { upgradePath = '/pricing' } = options;
    try {
      let company = req.user?.company || null;
      if (!company && req.companyId) {
        company = await Company.findByPk(req.companyId);
      }
      const planId = resolvePlanIdForCompany(company);
      const plan = getPlan(planId);
      const available = Boolean(plan?.features?.[featureKey]);
      if (!available) {
        return next(
          new ApiError(
            403,
            'FORBIDDEN',
            'Feature not available for current plan',
            buildDeniedPayload(plan, featureKey, upgradePath),
          ),
        );
      }
      req.plan = plan;
      req.planId = planId;
      return next();
    } catch (error) {
      return next(error);
    }
  };

module.exports = {
  requirePlanFeature,
};
