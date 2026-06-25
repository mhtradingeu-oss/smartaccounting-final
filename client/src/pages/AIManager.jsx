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

const severityRanks = {
  low: 1,
  medium: 2,
  high: 3,
};

const normalizeSeverity = (severity) => {
  const normalized = String(severity || '').trim().toLowerCase();
  return severityRanks[normalized] ? normalized : 'low';
};

const getSeverityRank = (severity) => severityRanks[normalizeSeverity(severity)];

const isPendingInvoice = (invoice) => {
  const status = String(invoice?.status || '').toUpperCase();
  return ['DRAFT', 'PENDING', 'OVERDUE'].includes(status);
};

const isUnreconciled = (transaction) => transaction && transaction.isReconciled === false;

const getInvoiceSeverity = (invoice) => (
  String(invoice?.status || '').toUpperCase() === 'OVERDUE' ? 'high' : 'medium'
);

const buildEntityLink = (item) => {
  const entityType = item?.entityType || item?.type;
  if (entityType === 'invoice') return '/invoices';
  if (entityType === 'bankTransaction') return '/bank-statements';
  if (entityType === 'expense') return '/expenses';
  if (entityType === 'insight') return '/ai-advisor';
  return '/ai-assistant';
};

const buildEvidence = ({ source, rule, entityType, entityId, detail }) => ({
  source,
  rule,
  entityType,
  entityId,
  detail,
});

const buildPriorityDecision = ({ context, insights }) => {
  const insightItems = Array.isArray(insights) ? insights : [];
  const highInsight = insightItems.find((insight) => normalizeSeverity(insight?.severity) === 'high');

  if (highInsight) {
    const decision = {
      title: highInsight.summary || highInsight.type || 'High-severity AI insight needs review',
      severity: 'high',
      reason: 'High-severity insights are reviewed before routine accounting follow-up.',
      source: 'AI insights',
      entityType: 'insight',
      entityId: highInsight.id,
      actionLabel: 'Open AI insights',
      evidence: [
        buildEvidence({
          source: 'AI insights',
          rule: 'Priority 1: high severity insights',
          entityType: 'insight',
          entityId: highInsight.id,
          detail: highInsight.type || highInsight.summary || 'High-severity insight',
        }),
      ],
    };
    return { ...decision, route: buildEntityLink(decision) };
  }

  const unreconciledTransaction = (context?.bankTransactions || []).find(isUnreconciled);
  if (unreconciledTransaction) {
    const decision = {
      title: unreconciledTransaction.description || `Bank transaction #${unreconciledTransaction.id}`,
      severity: 'medium',
      reason: 'Unreconciled bank activity can affect cash visibility and reporting readiness.',
      source: 'Assistant context',
      entityType: 'bankTransaction',
      entityId: unreconciledTransaction.id,
      actionLabel: 'Review bank statements',
      evidence: [
        buildEvidence({
          source: 'Assistant context',
          rule: 'Priority 2: unreconciled bank transactions',
          entityType: 'bankTransaction',
          entityId: unreconciledTransaction.id,
          detail: unreconciledTransaction.description || 'Unreconciled bank transaction',
        }),
      ],
    };
    return { ...decision, route: buildEntityLink(decision) };
  }

  const openInvoice = (context?.invoices || []).find(isPendingInvoice);
  if (openInvoice) {
    const decision = {
      title: `Invoice #${openInvoice.id}`,
      severity: getInvoiceSeverity(openInvoice),
      reason: 'Open invoices are useful starting points for receivables follow-up and cash planning.',
      source: 'Assistant context',
      entityType: 'invoice',
      entityId: openInvoice.id,
      actionLabel: 'Review invoices',
      evidence: [
        buildEvidence({
          source: 'Assistant context',
          rule: 'Priority 3: overdue, pending, or draft invoices',
          entityType: 'invoice',
          entityId: openInvoice.id,
          detail: `Status: ${openInvoice.status || 'pending'}`,
        }),
      ],
    };
    return { ...decision, route: buildEntityLink(decision) };
  }

  const mediumInsight = insightItems.find((insight) => normalizeSeverity(insight?.severity) === 'medium');
  if (mediumInsight) {
    const decision = {
      title: mediumInsight.summary || mediumInsight.type || 'Medium-severity AI insight needs review',
      severity: 'medium',
      reason: 'Medium-severity insights are reviewed after higher-priority accounting exceptions.',
      source: 'AI insights',
      entityType: 'insight',
      entityId: mediumInsight.id,
      actionLabel: 'Open AI insights',
      evidence: [
        buildEvidence({
          source: 'AI insights',
          rule: 'Priority 4: medium severity insights',
          entityType: 'insight',
          entityId: mediumInsight.id,
          detail: mediumInsight.type || mediumInsight.summary || 'Medium-severity insight',
        }),
      ],
    };
    return { ...decision, route: buildEntityLink(decision) };
  }

  const decision = {
    title: 'No priority decision available',
    severity: 'low',
    reason: 'No high-priority AI insight, unreconciled bank transaction, or open invoice is visible.',
    source: 'Assistant context and AI insights',
    entityType: 'fallback',
    entityId: null,
    route: '/ai-assistant',
    actionLabel: 'Review evidence',
    evidence: [
      buildEvidence({
        source: 'Assistant context and AI insights',
        rule: 'Priority 5: missing data or no action',
        entityType: 'fallback',
        entityId: null,
        detail: 'No visible decision items in the current read-only context',
      }),
    ],
  };
  return decision;
};

const buildNextBestAction = ({ priorityDecision }) => ({
  title: priorityDecision?.actionLabel || 'Review evidence',
  severity: priorityDecision?.severity || 'low',
  reason: priorityDecision?.reason || 'Review the available read-only evidence before deciding what to do next.',
  source: priorityDecision?.source || 'AI Manager',
  entityType: priorityDecision?.entityType || 'fallback',
  entityId: priorityDecision?.entityId || null,
  route: priorityDecision?.route || '/ai-assistant',
  actionLabel: priorityDecision?.actionLabel || 'Review evidence',
  evidence: priorityDecision?.evidence || [],
});

const buildEvidenceTrail = ({ priorityDecision, context, insights }) => {
  const evidence = [...(priorityDecision?.evidence || [])];
  const highInsightCount = (insights || []).filter((insight) => normalizeSeverity(insight?.severity) === 'high').length;
  const unreconciledCount = (context?.bankTransactions || []).filter(isUnreconciled).length;
  const openInvoiceCount = (context?.invoices || []).filter(isPendingInvoice).length;

  evidence.push(
    buildEvidence({
      source: 'AI insights',
      rule: 'High severity insight count',
      entityType: 'insight',
      entityId: null,
      detail: `${highInsightCount} high-severity insight${highInsightCount === 1 ? '' : 's'}`,
    }),
    buildEvidence({
      source: 'Assistant context',
      rule: 'Unreconciled bank transaction count',
      entityType: 'bankTransaction',
      entityId: null,
      detail: `${unreconciledCount} unreconciled bank transaction${unreconciledCount === 1 ? '' : 's'}`,
    }),
    buildEvidence({
      source: 'Assistant context',
      rule: 'Open invoice count',
      entityType: 'invoice',
      entityId: null,
      detail: `${openInvoiceCount} overdue, pending, or draft invoice${openInvoiceCount === 1 ? '' : 's'}`,
    }),
  );

  return evidence;
};

const buildReviewQueue = ({ context, insights }) => {
  const queue = [];

  (insights || [])
    .filter((insight) => normalizeSeverity(insight?.severity) === 'high')
    .slice(0, 3)
    .forEach((insight) => {
      queue.push({
        id: `insight-${insight.id}`,
        title: insight.summary || `${insight.type || 'AI insight'} needs review`,
        reason: 'High-severity AI insight',
        severity: 'high',
        source: 'AI insights',
        entityType: 'insight',
        entityId: insight.id,
        route: '/ai-advisor',
        actionLabel: 'Open AI insights',
      });
    });

  (context?.bankTransactions || [])
    .filter(isUnreconciled)
    .slice(0, 3)
    .forEach((transaction) => {
      queue.push({
        id: `bank-${transaction.id}`,
        title: transaction.description || `Bank transaction #${transaction.id}`,
        reason: 'Unreconciled bank transaction',
        severity: 'medium',
        source: 'Assistant context',
        entityType: 'bankTransaction',
        entityId: transaction.id,
        route: '/bank-statements',
        actionLabel: 'Review bank statements',
      });
    });

  (context?.invoices || [])
    .filter(isPendingInvoice)
    .slice(0, 3)
    .forEach((invoice) => {
      queue.push({
        id: `invoice-${invoice.id}`,
        title: `Invoice #${invoice.id}`,
        reason: `Status: ${invoice.status || 'pending'}`,
        severity: getInvoiceSeverity(invoice),
        source: 'Assistant context',
        entityType: 'invoice',
        entityId: invoice.id,
        route: '/invoices',
        actionLabel: 'Review invoices',
      });
    });

  (insights || [])
    .filter((insight) => normalizeSeverity(insight?.severity) === 'medium')
    .slice(0, 3)
    .forEach((insight) => {
      queue.push({
        id: `medium-insight-${insight.id}`,
        title: insight.summary || `${insight.type || 'AI insight'} needs review`,
        reason: 'Medium-severity AI insight',
        severity: 'medium',
        source: 'AI insights',
        entityType: 'insight',
        entityId: insight.id,
        route: '/ai-advisor',
        actionLabel: 'Open AI insights',
      });
    });

  return queue
    .sort((a, b) => getSeverityRank(b.severity) - getSeverityRank(a.severity))
    .slice(0, 6);
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
    () => insights.filter((insight) => normalizeSeverity(insight?.severity) === 'high'),
    [insights],
  );

  const priorityDecision = useMemo(
    () => buildPriorityDecision({ context, insights }),
    [context, insights],
  );

  const nextBestAction = useMemo(
    () => buildNextBestAction({ priorityDecision, context, insights }),
    [priorityDecision, context, insights],
  );

  const evidenceTrail = useMemo(
    () => buildEvidenceTrail({ priorityDecision, context, insights }),
    [priorityDecision, context, insights],
  );

  const reviewQueue = useMemo(
    () => buildReviewQueue({ context, insights }),
    [context, insights],
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
            'AI Manager only reads context and points reviewers to existing workspaces.',
            'Assistant context and AI insights are loaded through existing audited read-only endpoints.',
            'Accounting staff remain responsible for review and decisions.',
          ]}
          policyUrl={null}
        />
      </header>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20" aria-label="AI Manager capabilities">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">What AI can help with</h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              SmartAccounting AI can read, analyze, explain, and suggest safe next steps from company-scoped accounting evidence.
            </p>
          </div>
          <AIBadge label="Read-only" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Invoices', 'Review overdue, pending, and missing-evidence invoices.'],
            ['Expenses', 'Check VAT evidence, categories, attachments, and draft readiness.'],
            ['Bank reconciliation', 'Highlight unreconciled transactions and possible review paths.'],
            ['VAT / Umsatzsteuer', 'Explain input VAT, output VAT, and missing VAT evidence from supplied data.'],
            ['Reports & journal entries', 'Explain posted accounting truth, balances, and report gaps.'],
            ['DATEV & audit readiness', 'Review export readiness, GoBD evidence, and audit signals.'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-xl border border-blue-100 bg-white px-4 py-3 dark:border-blue-900/40 dark:bg-gray-900/80">
              <p className="text-sm font-semibold text-gray-950 dark:text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">{description}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
          Advisory only: AI does not post, pay, file, delete, reconcile, or certify records. Compliance-critical German tax, VAT filing, payment, or legal decisions must be reviewed by a qualified Steuerberater.
        </p>
      </section>

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
          type="Priority decision"
          summary={priorityDecision.title}
          confidence="medium"
          severity={priorityDecision.severity}
          dataSource={priorityDecision.source}
          lastEvaluated="Current assistant context"
          why={priorityDecision.reason}
          ExplainWhy={ExplainWhy}
        />

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Next best action</h2>
            <AISeverityPill severity={nextBestAction.severity} />
          </div>
          <p className="font-medium text-gray-950 dark:text-white">{nextBestAction.title}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{nextBestAction.reason}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link to={nextBestAction.route}>
              <Button variant="outline" size="sm">
                {nextBestAction.actionLabel}
              </Button>
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {nextBestAction.source}
            </span>
          </div>
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Why this matters</h2>
            <AIBadge label="Reason" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{priorityDecision.reason}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-950/70">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Entity
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-950 dark:text-white">
                {priorityDecision.entityType}
                {priorityDecision.entityId ? ` #${priorityDecision.entityId}` : ''}
              </dd>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-950/70">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Source
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-950 dark:text-white">{priorityDecision.source}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Evidence</h2>
            <AIBadge label="Trail" />
          </div>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            {evidenceTrail.map((item, index) => (
              <li key={`${item.source}-${item.rule}-${item.entityType}-${item.entityId || index}`} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/70">
                <p className="font-medium text-gray-950 dark:text-white">{item.detail}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Source: {item.source} · Rule: {item.rule} · Entity: {item.entityType}
                  {item.entityId ? ` #${item.entityId}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Review queue</h2>
            <AIBadge label="Review" />
          </div>

          {reviewQueue.length ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {reviewQueue.map((item) => (
                <li key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-950 dark:text-white">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.reason}</p>
                      <Link className="mt-2 inline-flex text-xs font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300" to={item.route}>
                        {item.actionLabel}
                      </Link>
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
      </section>
    </div>
  );
}
