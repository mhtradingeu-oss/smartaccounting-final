export default function AIDecisionLayer() {
  return (
    <div className="mt-6 grid gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
        AI Decision Layer
      </div>

      <div className="space-y-1 text-sm text-indigo-900 dark:text-indigo-100">
        <p>• Review invoice status mix before closing the period.</p>
        <p>• VAT position is based on posted accounting activity.</p>
        <p>• AI suggestions stay read-only and require human review.</p>
      </div>
    </div>
  );
}
