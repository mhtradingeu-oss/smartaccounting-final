'use strict';

const { getProviderConfig } = require('./providers/providerConfig');

function checkProviderBudget({
  estimatedCostCents = 0,
  spentTodayCents = 0,
  config = getProviderConfig(),
} = {}) {
  const dailyBudgetCents = Number(config.dailyBudgetCents);
  const safeBudget = Number.isFinite(dailyBudgetCents) && dailyBudgetCents > 0 ? dailyBudgetCents : 500;
  const safeEstimated = Number.isFinite(Number(estimatedCostCents))
    ? Math.max(0, Number(estimatedCostCents))
    : 0;
  const safeSpent = Number.isFinite(Number(spentTodayCents))
    ? Math.max(0, Number(spentTodayCents))
    : 0;
  const projectedSpendCents = safeSpent + safeEstimated;
  const allowed = projectedSpendCents <= safeBudget;

  return {
    allowed,
    reason: allowed ? 'within_budget' : 'daily_budget_exceeded',
    metadata: {
      provider: config.provider || 'mock',
      enabled: Boolean(config.enabled),
      dailyBudgetCents: safeBudget,
      spentTodayCents: safeSpent,
      estimatedCostCents: safeEstimated,
      projectedSpendCents,
    },
  };
}

module.exports = {
  checkProviderBudget,
};
