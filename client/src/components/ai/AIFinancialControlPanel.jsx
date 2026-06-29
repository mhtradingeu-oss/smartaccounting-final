export default function AIFinancialControlPanel() {
  return (
    <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            AI Financial Control System
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Explainable intelligence layer (read-only)
          </p>
        </div>

        {/* LIVE PULSE */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Live</span>
        </div>
      </div>

      {/* SCORE + RISK GRID */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Confidence */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-xs text-indigo-500">AI Confidence</p>
          <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">87%</p>
        </div>

        {/* VAT Risk */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs text-amber-500">VAT Risk</p>
          <p className="text-lg font-bold text-amber-900 dark:text-amber-100">Low</p>
        </div>

        {/* Cashflow */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-xs text-emerald-500">Cashflow</p>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Stable</p>
        </div>
      </div>

      {/* EXPLANATION LAYER */}
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
        <p>• AI analyzed posted invoices and bank statement alignment</p>
        <p>• No critical VAT anomalies detected in current dataset snapshot</p>
        <p>• Expense pattern remains consistent with previous period</p>
      </div>

      {/* FOOTER ACTION HINT */}
      <div className="text-xs text-gray-400">
        This layer is read-only. All financial actions require explicit approval.
      </div>
    </div>
  );
}
