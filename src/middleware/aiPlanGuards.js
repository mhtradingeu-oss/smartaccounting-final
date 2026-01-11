const { requirePlanFeature } = require('./planGuard');

const requireAssistantPlan = requirePlanFeature('aiAssistant');
const requireSuggestPlan = requirePlanFeature('aiSuggest');

module.exports = {
  requireAssistantPlan,
  requireSuggestPlan,
};
