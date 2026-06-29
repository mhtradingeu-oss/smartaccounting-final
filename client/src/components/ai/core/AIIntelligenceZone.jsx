import AIDecisionLayer from '../AIDecisionLayer';
import AIFinancialControlPanel from '../AIFinancialControlPanel';

export default function AIIntelligenceZone() {
  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
        AI Intelligence Zone
      </div>

      <AIDecisionLayer />
      <AIFinancialControlPanel />
      <AIIntelligenceZone />
    </div>
  );
}
