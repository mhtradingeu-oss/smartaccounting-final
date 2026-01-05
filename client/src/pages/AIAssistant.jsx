import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import FeatureGate from '../components/FeatureGate';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { isReadOnlyRole } from '../lib/permissions';
import { formatCurrency, formatDate, formatPercent } from '../lib/utils/formatting';
import { aiAssistantAPI } from '../services/aiAssistantAPI';
import { isAIAssistantEnabled } from '../lib/featureFlags';
import { formatApiError } from '../services/api';

const INTENT_OPTIONS = [
  {
    id: 'review',
    label: 'What should I review?',
    description: 'Prioritizes overdue invoices, pending approvals, and unreconciled transactions.',
  },
  {
    id: 'risks',
    label: 'Are there risks?',
    description: 'Summarizes high/medium-risk AI insights that require audit attention.',
  },
  {
    id: 'explain_transaction',
    label: 'Explain this transaction',
    description: 'Breaks down why a flagged transaction looks unusual with evidence.',
  },
  {
    id: 'why_flagged',
    label: 'Why is this flagged?',
    description: 'Connects the flag to the governing rule, legal context, and confidence score.',
  },
];

const severityPillClasses = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  low: 'bg-green-50 text-green-700 border-green-100',
};

const initialMessageText = (context) => {
  if (!context) {
    return 'I monitor your accounting landscape. Choose an intent to begin.';
  }
  const insightCount = context.insights?.length ?? 0;
  const invoiceCount = context.invoices?.length ?? 0;
  const transactionCount = context.bankTransactions?.length ?? 0;
  return `Monitoring ${context.company?.name ?? 'your company'} — ${insightCount} insights, ${invoiceCount} invoices, ${transactionCount} transactions. Ask me anything.`;
};

const AIAssistant = () => {
  const { user } = useAuth();
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contextError, setContextError] = useState(null);
  const [askError, setAskError] = useState(null);
  const [isAsking, setIsAsking] = useState(false);
  const initialMessageSent = useRef(false);
  const aiAssistantEnabled = isAIAssistantEnabled();

  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].speaker === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!aiAssistantEnabled) {
      return;
    }
    let cancelled = false;

    const loadAssistantData = async () => {
      setLoading(true);
      setContextError(null);
      try {
        const [sessionResp, contextResp] = await Promise.all([
          aiAssistantAPI.startSession(),
          aiAssistantAPI.getContext(),
        ]);
        if (!cancelled) {
          setSessionId(sessionResp?.sessionId ?? null);
          setContext(contextResp);
        }
      } catch (err) {
        if (!cancelled) {
          setContextError(formatApiError(err, 'Unable to load the AI assistant.').message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAssistantData();
    return () => {
      cancelled = true;
    };
  }, [aiAssistantEnabled]);

  useEffect(() => {
    if (!context || initialMessageSent.current) {
      return;
    }
    const intro = initialMessageText(context);
    setMessages([{ id: 'assistant-intro', speaker: 'assistant', text: intro }]);
    initialMessageSent.current = true;
  }, [context]);

  const invoiceStatusBreakdown = useMemo(() => {
    const breakdown = {};
    (context?.invoices || []).forEach((invoice) => {
      const status = invoice.status || 'unknown';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }, [context]);

  const expenseStatusBreakdown = useMemo(() => {
    const breakdown = {};
    (context?.expenses || []).forEach((expense) => {
      const status = expense.status || 'draft';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }, [context]);

  const unreconciledCount = useMemo(() => {
    return (context?.bankTransactions || []).filter((tx) => !tx.isReconciled).length;
  }, [context]);

  const handleIntent = async (intentId, options = {}) => {
    if (!sessionId) {
      setAskError('Session is initializing. Please wait a moment.');
      return;
    }
    const intentMeta = INTENT_OPTIONS.find((intent) => intent.id === intentId);
    const prompt = options.prompt || intentMeta?.label || intentId;
    setAskError(null);
    setIsAsking(true);
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, speaker: 'user', text: prompt }]);
    try {
      const response = await aiAssistantAPI.askIntent({
        intent: intentId,
        prompt,
        targetInsightId: options.targetInsightId,
        sessionId,
      });
      const answer = response?.answer ?? {};
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          speaker: 'assistant',
          text: answer.message || 'The assistant has no data yet.',
          highlights: answer.highlights,
          references: answer.references,
        },
      ]);
    } catch (err) {
      setAskError(formatApiError(err, 'Unable to reach the assistant.').message);
    } finally {
      setIsAsking(false);
    }
  };

  if (loading && !context) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-live="polite"
        aria-label="Loading AI assistant"
      >
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (contextError) {
    return (
      <EmptyState
        title="Unable to load the AI assistant"
        description={contextError || 'Please try again later.'}
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <FeatureGate
      enabled={aiAssistantEnabled}
      featureName="AI Assistant"
      description="Enable AI_ASSISTANT_ENABLED to open the conversational advisor."
      ctaLabel="Back to dashboard"
      ctaPath="/dashboard"
    >
      <div className="space-y-6">
        {isReadOnlyRole(user?.role) && (
          <ReadOnlyBanner
            mode="Viewer"
            message="AI Assistant replies are advisory only."
            details="No data is changed; every interaction is audit logged."
          />
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Accounting Assistant</h1>
            <p className="text-sm text-gray-500">
              A conversational, read-only advisor that highlights issues and refers to explainable
              insights.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            Session ID{' '}
            <span className="font-mono text-gray-700">
              {sessionId ? sessionId.slice(0, 8) : 'pending...'}
            </span>
            <div className="text-2xs text-gray-500 dark:text-gray-400 mt-1">
              All interactions are logged to the immutable audit trail.
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">Company context</span>
              <span className="text-xs text-gray-500">Read-only</span>
            </div>
            <p className="text-sm text-gray-600">{context?.company?.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {context?.company?.city}, {context?.company?.country}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              AI Enabled: {context?.company?.aiEnabled === false ? 'No' : 'Yes'}
            </p>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Invoices</span>
              <span className="text-xs text-gray-500">
                {context?.invoices?.length ?? 0} records
              </span>
            </div>
            {Object.keys(invoiceStatusBreakdown).length ? (
              <ul className="space-y-2 text-sm text-gray-600">
                {Object.entries(invoiceStatusBreakdown).map(([status, count]) => (
                  <li key={status} className="flex justify-between">
                    <span className="capitalize">{status}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No invoices available yet.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Expenses</span>
              <span className="text-xs text-gray-500">
                {context?.expenses?.length ?? 0} records
              </span>
            </div>
            {Object.keys(expenseStatusBreakdown).length ? (
              <ul className="space-y-2 text-sm text-gray-600">
                {Object.entries(expenseStatusBreakdown).map(([status, count]) => (
                  <li key={status} className="flex justify-between">
                    <span className="capitalize">{status}</span>
                    <span>{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">No expenses logged yet.</p>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">Bank statements</span>
              <span className="text-xs text-gray-500">{unreconciledCount} unreconciled</span>
            </div>
            <p className="text-sm text-gray-600">
              Transactions monitored: {context?.bankTransactions?.length ?? 0}
            </p>
            {context?.bankTransactions?.length ? (
              <p className="text-xs text-gray-500 mt-2">
                Latest: {context.bankTransactions[0].description} ·{' '}
                {formatDate(context.bankTransactions[0].transactionDate)} ·{' '}
                {formatCurrency(
                  context.bankTransactions[0].amount,
                  context.bankTransactions[0].currency,
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Upload bank data to surface reconciliation insights.
              </p>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">AI insights</span>
              <span className="text-xs text-blue-600">Explainable + auditable</span>
            </div>
            {context?.insights?.length ? (
              <div className="space-y-3">
                {context.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-lg border border-gray-100 p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-900">{insight.type}</span>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${severityPillClasses[insight.severity] || 'border-gray-200 text-gray-600'}`}
                      >
                        {insight.severity ?? 'unknown'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{insight.summary}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Confidence: {formatPercent(insight.confidenceScore ?? 0, 0)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isAsking}
                        onClick={() =>
                          handleIntent('explain_transaction', {
                            targetInsightId: insight.id,
                            prompt: `Explain insight ${insight.type}`,
                          })
                        }
                      >
                        Explain transaction
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isAsking}
                        onClick={() =>
                          handleIntent('why_flagged', {
                            targetInsightId: insight.id,
                            prompt: `Why is insight ${insight.type} flagged?`,
                          })
                        }
                      >
                        Why flagged?
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No AI insights yet. The model will analyze data over time.
              </p>
            )}
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assistant chat</h2>
                <p className="text-xs text-gray-500 mt-1">
                  The assistant references invoices, expenses, bank statements, and AI insights.
                  Every answer is grounded and audit logged.
                </p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Read-only advisor</span>
            </div>
            <div
              className="sr-only"
              role="status"
              aria-live="polite"
            >
              {latestAssistantMessage
                ? `Assistant answered: ${latestAssistantMessage.text}`
                : 'The assistant is ready for your request.'}
            </div>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg border ${
                    message.speaker === 'assistant'
                      ? 'border-gray-200 bg-white'
                      : 'border-primary-400 bg-primary-50'
                  } p-4`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {message.speaker === 'assistant' ? 'AI Assistant' : 'You'}
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{message.text}</p>
                  {message.highlights && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-600">
                      {message.highlights.map((line, index) => (
                        <li key={`${message.id}-highlight-${index}`}>• {line}</li>
                      ))}
                    </ul>
                  )}
                  {message.references && (
                    <div className="mt-2 text-[11px] text-gray-500">
                      References: {message.references.join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {askError && (
              <div
                className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
                role="alert"
                aria-live="assertive"
              >
                {askError}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {INTENT_OPTIONS.map((intent) => (
                <Button
                  key={intent.id}
                  variant="primary"
                  size="md"
                  disabled={isAsking}
                  onClick={() => handleIntent(intent.id)}
                  className="justify-start text-left"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{intent.label}</span>
                    <span className="text-xs text-gray-100">{intent.description}</span>
                  </div>
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supported intents: {INTENT_OPTIONS.map((intent) => intent.label).join(', ')}.
            </p>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Session & audit</h3>
            <p className="text-sm text-gray-600">
              Every session is anchored in an immutable audit log entry. Questions and answers are
              recorded with hashed prompts.
            </p>
            <p className="text-xs text-gray-500">
              Session tracked as {sessionId ? sessionId : 'pending...'}
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Refresh assistant
            </Button>
          </Card>
        </div>
      </div>
    </FeatureGate>
  );
};

export default AIAssistant;
