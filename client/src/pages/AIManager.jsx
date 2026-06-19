import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatBubbleLeftRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AIBadge } from '../components/AIBadge';
import AIInsightCard from '../components/AIInsightCard';
import AISeverityPill from '../components/AISeverityPill';
import AITrustBanner from '../components/AITrustBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { useCompany } from '../context/CompanyContext';
import { aiAssistantAPI } from '../services/aiAssistantAPI';
import { aiInsightsAPI } from '../services/aiInsightsAPI';
import { formatApiError } from '../services/api';

const ExplainWhy = ({ why }) => <p className="text-sm text-gray-600 dark:text-gray-300">{why}</p>;

const countItems = (items) => (Array.isArray(items) ? items.length : 0);

const isPendingInvoice = (invoice) => {
  const status = String(invoice?.status || '').toUpperCase();
  return ['DRAFT', 'PENDING', 'SENT', 'OVERDUE'].includes(status);
};

const isUnreconciled = (transaction) => transaction && transaction.isReconciled === false;

const buildReviewQueue = ({ context, insights }) => {
  const queue = [];

  insights
    .filter((insight) => insight.severity === 'high')
    .slice(0, 3)
    .forEach((insight) => {
      queue.push({
        id: `insight-${insight.id}`,
        label: insight.summary || `${insight.type || 'AI insight'} needs review`,
        meta: 'High-severity AI insight',
        severity: 'high',
      });
    });

  (context?.bankTransactions || [])
    .filter(isUnreconciled)
    .slice(0, 3)
    .forEach((transaction) => {
      queue.push({
        id: `bank-${transaction.id}`,
        label: transaction.description || `Bank transaction #${transaction.id}`,
        meta: 'Unreconciled bank transaction',
        severity: 'medium',
      });
    });

  (context?.invoices || [])
    .filter(isPendingInvoice)
    .slice(0, 3)
    .forEach((invoice) => {
      queue.push({
        id: `invoice-${invoice.id}`,
        label: `Invoice #${invoice.id}`,
        meta: `Status: ${invoice.status || 'pending'}`,
        severity: String(invoice.status || '').toUpperCase() === 'OVERDUE' ? 'high' : 'medium',
      });
    });

  return queue.slice(0, 6);
};

const resolveNextBestAction = ({ context, insights, reviewQueue }) => {
  const highRisk = insights.find((insight) => insight.severity === 'high');
  if (highRisk) {
    return {
      type: 'Review high-severity AI insight',
      summary: highRisk.summary || 'A high-severity AI insight needs review.',
      severity: 'high',
      dataSource: 'AI insights',
      why: 'High-severity insights should be reviewed before routine bookkeeping tasks.',
    };
  }

  const unreconciledCount = (context?.bankTransactions || []).filter(isUnreconciled).length;
  if (unreconciledCount > 0) {
    return {
      type: 'Review bank reconciliation',
      summary: `${unreconciledCount} bank transaction${unreconciledCount === 1 ? '' : 's'} need reconciliation review.`,
      severity: 'medium',
      dataSource: 'Assistant context, bank transactions',
      why: 'Unreconciled bank activity can affect invoice status, cash visibility, and reporting readiness.',
    };
  }

  const pendingCount = (context?.invoices || []).filter(isPendingInvoice).length;
  if (pendingCount > 0) {
    return {
      type: 'Review open invoices',
      summary: `${pendingCount} invoice${pendingCount === 1 ? '' : 's'} may need follow-up.`,
      severity: 'medium',
      dataSource: 'Assistant context, invoices',
      why: 'Open invoices are useful starting points for receivables follow-up and cash planning.',
    };
  }

  if (reviewQueue.length > 0) {
    return {
      type: 'Review accounting queue',
      summary: 'The review queue contains advisory items that may need attention.',
      severity: 'low',
      dataSource: 'AI Manager review queue',
      why: 'Review queue items keep accounting work focused without allowing AI to change records.',
    };
  }

  return {
    type: 'No urgent AI action',
    summary: 'No high-priority AI review items are visible in the current context.',
    severity: 'low',
    dataSource: 'Assistant context, AI insights',
    why: 'The current AI Manager view is advisory. Refresh later after new invoices, expenses, or bank imports.',
  };
};

export default function AIManager() {
  const { activeCompany } = useCompany();
  const activeCompanyId = activeCompany?.id;
  const [context, setContext] = useState(null);
  const [insights, setInsights] = useState([]);
  const [viewerLimited, setViewerLimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAIManagerData = useCallback(async () => {
    if (!activeCompanyId) {
      setContext(null);
      setInsights([]);
      setViewerLimited(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [assistantContext, insightsResult] = await Promise.all([
        aiAssistantAPI.getContext({ companyId: activeCompanyId }),
        aiInsightsAPI.list({ companyId: activeCompanyId }),
      ]);

      setContext(assistantContext || null);
      setInsights(insightsResult?.insights || []);
      setViewerLimited(Boolean(insightsResult?.viewerLimited));
    } catch (err) {
      setContext(null);
      setInsights([]);
      setViewerLimited(false);
      setError(formatApiError(err, 'Unable to load AI Manager data.'));
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    loadAIManagerData();
  }, [loadAIManagerData]);

  const briefingCounts = useMemo(
    () => ({
      invoices: countItems(context?.invoices),
      expenses: countItems(context?.expenses),
      bankTransactions: countItems(context?.bankTransactions),
      insights: countItems(insights),
    }),
    [context, insights],
  );

  const criticalAlerts = useMemo(
    () => insights.filter((insight) => insight.severity === 'high'),
    [insights],
  );

  const reviewQueue = useMemo(
    () => buildReviewQueue({ context, insights }),
    [context, insights],
  );

  const nextBestAction = useMemo(
    () => resolveNextBestAction({ context, insights, reviewQueue }),
    [context, insights, reviewQueue],
  );

  if (!activeCompanyId) {
    return (
      <EmptyState
        title="Select a company"
        description="AI Manager is scoped to the active company."
        help="Choose a company before reviewing AI accounting context."
      />
    );
  }

  if (loading) {
    return (
      <div
        className="mx-auto max-w-6xl space-y-6 py-4"
        role="status"
        aria-live="polite"
        aria-label="Loading AI Manager data"
      >
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Unable to load AI Manager"
        description={error.message}
        action={
          <Button variant="primary" onClick={loadAIManagerData} disabled={loading}>
            Retry
          </Button>
        }
        help="AI Manager is read-only. If this continues, check AI assistant and insights access."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-gray-900 dark:text-gray-100">
      <header className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-none">
        <div className="flex flex-wrap items-center gap-3">
          <AIBadge label="AI Manager" />
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Read-only advisory workspace
          </span>
          {viewerLimited ? (
            <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">
              Limited insight view
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-white">AI Accounting Manager</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              A company-scoped briefing surface for reviewing accounting context, risks, and
              explanations without changing records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" size="sm" onClick={loadAIManagerData} disabled={loading}>
              Refresh
            </Button>
            <Link to="/ai-advisor">
              <Button variant="outline" size="sm">
                Open AI Insights
              </Button>
            </Link>
            <Link to="/ai-assistant">
              <Button variant="secondary" size="sm">
                <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
                Open AI Assistant
              </Button>
            </Link>
          </div>
        </div>

        <AITrustBanner
          title="AI Manager Trust Notice"
          summary="AI Manager is read-only, audited, and scoped to the active company."
          items={[
            'AI Manager does not create, approve, pay, upload, or modify records.',
            'Assistant context and AI insights are loaded through existing audited read-only endpoints.',
            'Accounting staff remain responsible for review and decisions.',
          ]}
          policyUrl={null}
        />
      </header>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="AI Manager briefing summary">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Today’s Accounting Briefing</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Live read-only context from the assistant and AI insights feed for the active company.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ['Invoices', briefingCounts.invoices],
              ['Expenses', briefingCounts.expenses],
              ['Bank activity', briefingCounts.bankTransactions],
              ['AI insights', briefingCounts.insights],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-950/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-red-900/40 dark:bg-gray-900/80 dark:shadow-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Critical Alerts</h2>
            <AISeverityPill severity={criticalAlerts.length ? 'high' : 'low'} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {criticalAlerts.length
              ? `${criticalAlerts.length} high-severity AI insight${criticalAlerts.length === 1 ? '' : 's'} need review.`
              : 'No high-severity AI insights are visible right now.'}
          </p>
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AIInsightCard
          type={nextBestAction.type}
          summary={nextBestAction.summary}
          confidence="medium"
          severity={nextBestAction.severity}
          dataSource={nextBestAction.dataSource}
          lastEvaluated="Current assistant context"
          why={nextBestAction.why}
          ExplainWhy={ExplainWhy}
        />

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Review Queue</h2>
            <AIBadge label="Review" />
          </div>

          {reviewQueue.length ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {reviewQueue.map((item) => (
                <li key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-950 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.meta}</p>
                    </div>
                    <AISeverityPill severity={item.severity} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No review queue items are visible in the current read-only context.
            </p>
          )}
        </section>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none">
        <h2 className="text-lg font-bold text-gray-950 dark:text-white">Ask AI Manager</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Use the floating AI Manager companion for quick read-only prompts, or open the existing AI
          Assistant for the full conversational workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/ai-assistant">
            <Button variant="primary" size="sm">
              Open AI Assistant
            </Button>
          </Link>
          <Link to="/ai-advisor">
            <Button variant="outline" size="sm">
              Open AI Insights
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
