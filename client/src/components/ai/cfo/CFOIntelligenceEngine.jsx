import React, { useMemo } from 'react';

export default function CFOIntelligenceEngine({ data = {} }) {
  const insights = useMemo(() => {
    const hasAccountingTruth = Boolean(data.hasAccountingTruth);
    const hasVatSummary = Boolean(data.hasVatSummary);
    const hasAuditReadiness = Boolean(data.hasAuditReadiness);

    return {
      cashflowRisk: hasAccountingTruth ? 'LOW' : 'REVIEW',
      revenueTrend: hasAccountingTruth ? 'STABLE' : 'WAITING FOR DATA',
      expenseAlert: hasVatSummary ? 'NORMAL' : 'CHECK VAT DATA',
      liquidity: hasAuditReadiness ? 'HEALTHY' : 'MONITOR',
    };
  }, [data]);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
      <div className="mb-3 font-bold">
        UI-8 CFO Intelligence Engine
      </div>

      <div className="space-y-1 opacity-90">
        <div>Cashflow Risk: {insights.cashflowRisk}</div>
        <div>Revenue Trend: {insights.revenueTrend}</div>
        <div>Expense Status: {insights.expenseAlert}</div>
        <div>Liquidity: {insights.liquidity}</div>
      </div>

      <div className="mt-3 font-semibold text-emerald-700 dark:text-emerald-200">
        Autonomous CFO mode active · read-only intelligence
      </div>
    </div>
  );
}
