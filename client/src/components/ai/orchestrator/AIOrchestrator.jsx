const displayValue = (value) => value || 'Unavailable';

export default function AIOrchestrator({ state = {} }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          AI Orchestrator
        </p>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Single AI intelligence view
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusItem
          label="Company scope"
          value={displayValue(state.companyName || state.companyId)}
        />
        <StatusItem label="Accounting source" value={displayValue(state.accountingSource)} />
        <StatusItem label="VAT summary" value={displayValue(state.vatSummaryStatus)} />
        <StatusItem label="Audit readiness" value={displayValue(state.auditReadinessStatus)} />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        Backend sourced. Visualization only.
      </p>
    </section>
  );
}

function StatusItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
