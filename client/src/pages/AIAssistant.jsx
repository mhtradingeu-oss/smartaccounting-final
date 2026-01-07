import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InfoTooltip from '../components/ui/InfoTooltip';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import FeatureGate from '../components/FeatureGate';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { isReadOnlyRole } from '../lib/permissions';
import { formatCurrency, formatDate, formatPercent } from '../lib/utils/formatting';
import { aiAssistantAPI } from '../services/aiAssistantAPI';
import { isAIAssistantEnabled } from '../lib/featureFlags';
import { formatApiError } from '../services/api';
import ChatMessageGroup from '../components/ChatMessageGroup';
import ChatEmptyState from '../components/ChatEmptyState';
import ChatTypingIndicator from '../components/ChatTypingIndicator';

const INTENT_OPTIONS = [
  {
    id: 'review',
    label: 'What needs my attention?',
    description:
      'See a prioritized summary of overdue invoices, pending approvals, and unreconciled transactions.',
  },
  {
    id: 'risks',
    label: 'Show me key risks',
    description:
      'Get a concise overview of high and medium-risk insights that may require your review.',
  },
  {
    id: 'explain_transaction',
    label: 'Explain this transaction',
    description: 'Understand why a transaction was flagged, with clear supporting evidence.',
  },
  {
    id: 'why_flagged',
    label: 'Why was this flagged?',
    description: 'See the rule, legal context, and confidence score behind a flagged item.',
  },
];

const severityPillClasses = {
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  low: 'bg-green-50 text-green-700 border-green-100',
};

const initialMessageText = (context) => {
  if (!context) {
    return 'Welcome. I continuously monitor your accounting environment for you. Select a focus area to begin.';
  }
  const insightCount = context.insights?.length ?? 0;
  const invoiceCount = context.invoices?.length ?? 0;
  const transactionCount = context.bankTransactions?.length ?? 0;
  return `Monitoring ${context.company?.name ?? 'your company'}: ${insightCount} insights, ${invoiceCount} invoices, ${transactionCount} transactions. How can I assist you today?`;
};

const ROLE_LIMITATIONS = {
  viewer: {
    label: 'Viewer',
    message:
      'You have read-only access. The AI assistant provides explanations and summaries, but you cannot interact or ask questions.',
  },
  auditor: {
    label: 'Auditor',
    message:
      'You have audit access. The AI assistant provides explanations and audit-focused summaries. No actions or data changes are possible.',
  },
  accountant: {
    label: 'Accountant',
    message:
      'You can interact with the AI assistant for advisory insights, but all actions are non-binding and do not change records.',
  },
  admin: {
    label: 'Admin',
    message:
      'You have full access. The AI assistant provides advisory insights only and cannot make changes to data.',
  },
};

const AIAssistant = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const activeCompanyId = activeCompany?.id;
  const navigate = useNavigate();
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contextError, setContextError] = useState(null);
  // askError state removed; errors are now shown in chat messages
  const [isAsking, setIsAsking] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const initialMessageSent = useRef(false);
  const lastLoadedCompanyIdRef = useRef(null);
  const aiAssistantEnabled = isAIAssistantEnabled();
  const userRole = user?.role || 'viewer';
  const isReadOnly = isReadOnlyRole(userRole);
  const aiFeatureGateProps = {
    enabled: aiAssistantEnabled,
    featureName: 'AI Assistant',
    description: 'Enable AI_ASSISTANT_ENABLED to open the conversational advisor.',
    ctaLabel: 'Back to dashboard',
    ctaPath: '/dashboard',
  };

  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].speaker === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const resetAssistantState = () => {
    setContext(null);
    setSessionId(null);
    setMessages([]);
    initialMessageSent.current = false;

    setContextError(null);
    setIsAsking(false);
  };

  useEffect(() => {
    const prepareForLoad = () => {
      aiAssistantAPI.reset();
      resetAssistantState();
    };

    // If AI is disabled, no company, or user is read-only, do not call AI APIs
    if (!aiAssistantEnabled || !activeCompanyId || isReadOnly) {
      prepareForLoad();
      setLoading(false);
      lastLoadedCompanyIdRef.current = null;
      return;
    }

    if (lastLoadedCompanyIdRef.current === activeCompanyId) {
      return;
    }

    lastLoadedCompanyIdRef.current = activeCompanyId;
    prepareForLoad();

    let cancelled = false;

    const loadAssistantData = async () => {
      setLoading(true);
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
  }, [aiAssistantEnabled, activeCompanyId, isReadOnly]);

  useEffect(() => {
    if (!context || initialMessageSent.current) {
      return;
    }
    const intro = initialMessageText(context);
    setMessages([{ id: 'assistant-intro', speaker: 'assistant', text: intro }]);
    initialMessageSent.current = true;
  }, [context]);

  const invoiceStatusBreakdown = useMemo(() => {
    if (!context?.invoices) {
      return {};
    }
    const breakdown = {};
    context.invoices.forEach((invoice) => {
      const status = invoice.status || 'unknown';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }, [context]);

  const expenseStatusBreakdown = useMemo(() => {
    if (!context?.expenses) {
      return {};
    }
    const breakdown = {};
    context.expenses.forEach((expense) => {
      const status = expense.status || 'draft';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }, [context]);

  const unreconciledCount = useMemo(() => {
    if (!context?.bankTransactions) {
      return 0;
    }
    return context.bankTransactions.filter((tx) => !tx.isReconciled).length;
  }, [context]);

  if (!activeCompany) {
    return (
      <FeatureGate {...aiFeatureGateProps}>
        <EmptyState
          title="Select a company"
          description="Choose an active company to load the AI assistant context."
          action={
            <Button variant="primary" onClick={() => navigate('/companies')}>
              Select company
            </Button>
          }
        />
        <div className="mt-4 text-xs text-gray-500">
          <span className="font-semibold">Why is AI unavailable?</span> The AI assistant requires an
          active company context. If you do not have access, your role or feature flags may restrict
          this feature.
        </div>
      </FeatureGate>
    );
  }

  // Group consecutive messages by speaker for better UX
  function groupMessages(msgs) {
    if (!msgs.length) {
      return [];
    }
    const groups = [];
    let lastSpeaker = msgs[0].speaker;
    let group = { speaker: lastSpeaker, messages: [msgs[0]] };
    for (let i = 1; i < msgs.length; i++) {
      const msg = msgs[i];
      if (msg.speaker === lastSpeaker) {
        group.messages.push(msg);
      } else {
        groups.push(group);
        lastSpeaker = msg.speaker;
        group = { speaker: lastSpeaker, messages: [msg] };
      }
    }
    groups.push(group);
    return groups;
  }

  // Handle user input for typing indicator
  const handleUserInput = (e) => {
    setUserTyping(!!e.target.value);
  };

  const handleIntent = async (intentId, options = {}) => {
    // Prevent AI API calls for read-only users
    if (isReadOnly) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          speaker: 'assistant',
          text: '',
          error: 'Your role does not permit interacting with the AI assistant.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }
    if (!sessionId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          speaker: 'assistant',
          text: '',
          error: 'Session is initializing. Please wait a moment.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }
    const intentMeta = INTENT_OPTIONS.find((intent) => intent.id === intentId);
    const prompt = options.prompt || intentMeta?.label || intentId;

    setIsAsking(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        speaker: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setUserTyping(false);
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
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          speaker: 'assistant',
          text: '',
          error: formatApiError(err, 'Unable to reach the assistant.').message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  if (loading && !context && !isReadOnly) {
    return (
      <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading AI assistant">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (contextError) {
    return (
      <>
        <EmptyState
          title="Unable to load the AI assistant"
          description={contextError || 'Please try again later.'}
          action={
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
        <div className="mt-4 text-xs text-gray-500">
          <span className="font-semibold">Why is AI unavailable?</span> The assistant may be
          disabled due to feature flags, role restrictions, or temporary system limits. Contact your
          administrator if you believe this is an error.
        </div>
      </>
    );
  }

  // If user is read-only, show only explanation and no controls
  if (isReadOnly) {
    return (
      <FeatureGate {...aiFeatureGateProps}>
        <div className="space-y-6">
          <div className="mb-6 flex items-center gap-3">
            {(() => {
              const { AIBadge } = require('../components/AIBadge');
              return <AIBadge label="AI" />;
            })()}
            <h1 className="text-3xl font-bold text-gray-900">AI Accounting Assistant</h1>
          </div>
          <ReadOnlyBanner
            mode={ROLE_LIMITATIONS[userRole]?.label || 'Read-only'}
            message={ROLE_LIMITATIONS[userRole]?.message}
            details="You can view AI explanations and summaries, but cannot interact or ask questions."
          />
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 mb-2">
            <div className="font-semibold text-blue-800">AI Trust & Transparency</div>
            <div className="text-xs text-blue-700 mt-1">
              <ul className="list-disc ml-4">
                <li>AI answers are advisory-only and do not change your data.</li>
                <li>All responses are generated by AI and logged for audit.</li>
                <li>AI cannot make decisions or execute transactions.</li>
                <li>
                  Unavailable or disabled states are shown when your role or feature flags restrict
                  access.
                </li>
                <li>RBAC and feature flags strictly control access to AI features.</li>
              </ul>
            </div>
          </div>
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate {...aiFeatureGateProps}>
      <div className="space-y-6">
        {/* Role-based limitations banner for all users */}
        <div className="mb-4">
          <div className="rounded bg-blue-50 border border-blue-200 p-3">
            <div className="font-semibold text-blue-800">AI Assistant Limitations</div>
            <div className="text-xs text-blue-700 mt-1">
              {ROLE_LIMITATIONS[userRole]?.message ||
                'The AI assistant is advisory-only and does not change your data.'}
              <div className="text-xs text-yellow-800 mt-2">
                <strong>Advisory Only:</strong> AI features are strictly read-only for safety and
                compliance. No actions, changes, or transactions can be executed by AI. All
                responses are for informational purposes only, and every interaction is logged for
                audit. AI is helpful, never authoritative or dangerous.
              </div>
            </div>
          </div>
        </div>
        <div className="mb-6 flex items-center gap-3">
          {(() => {
            const { AIBadge } = require('../components/AIBadge');
            return (
              <AIBadge label="AI-generated" tooltip="This feature uses AI-generated content." />
            );
          })()}
          <h1 className="text-3xl font-bold text-gray-900">AI Accounting Assistant</h1>
        </div>
        {/* Trust & Clarity Banner */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 mb-2">
          <div className="font-semibold text-blue-800">AI Trust, Safety & Legal Notice</div>
          <div className="text-xs text-blue-700 mt-1">
            <ul className="list-disc ml-4">
              <li>
                <span className="font-semibold">AI-generated content:</span> All responses are
                generated by AI and are for informational and advisory purposes only.
              </li>
              <li>
                <span className="font-semibold">No guarantees or decisions:</span> The AI assistant
                does not make decisions, provide guarantees, or modify your data.
              </li>
              <li>
                <span className="font-semibold">Professional review required:</span> Always consult
                a qualified accountant or legal advisor before acting on AI suggestions.
              </li>
              <li>All interactions are logged for audit and compliance.</li>
              <li>Access is governed by role-based controls and feature flags.</li>
              <li className="mt-2">
                <a
                  href="https://www.iso.org/isoiec-23894-ai-risk-management.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline"
                >
                  Learn more about AI responsibility boundaries
                </a>
              </li>
            </ul>
          </div>
        </div>
        {isReadOnlyRole(user?.role) && (
          <ReadOnlyBanner
            mode="Viewer"
            message="AI Assistant replies are advisory only."
            details="No data is changed; every interaction is audit logged."
          />
        )}
        {/* Advisory-only indicator for all users */}
        <div className="mb-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
          <span className="font-semibold">Advisory Only:</span> This assistant provides AI-generated
          suggestions and explanations. It does not make decisions, provide guarantees, or modify
          records.{' '}
          <a
            href="https://www.iso.org/isoiec-23894-ai-risk-management.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline ml-1"
          >
            AI responsibility info
          </a>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Accounting Assistant</h1>
            <p className="text-sm text-gray-500">
              A conversational, read-only advisor that highlights issues and refers to explainable
              insights.
              <span className="block mt-1 text-xs text-blue-700">
                <span className="font-semibold">AI-generated:</span> All answers are generated by AI
                and should be reviewed by a qualified accountant or legal advisor. No guarantee of
                accuracy or completeness is provided.
              </span>
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
            <div className="text-2xs text-blue-700 mt-1">
              <span className="font-semibold">Trust indicator:</span> This session is advisory-only
              and all responses are AI-generated.{' '}
              <a
                href="https://www.iso.org/isoiec-23894-ai-risk-management.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                What does this mean?
              </a>
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
                      <span className="font-semibold text-sm text-gray-900 flex items-center">
                        {insight.type}
                        <InfoTooltip
                          text={`Why am I seeing this?\n\nThis insight was generated because: ${insight.why || 'AI detected a pattern or anomaly based on your accounting data.'}\n\nData source: ${insight.dataSource || 'Relevant invoices, transactions, or expenses.'}`}
                        />
                      </span>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${severityPillClasses[insight.severity] || 'border-gray-200 text-gray-600'}`}
                      >
                        {insight.severity ?? 'unknown'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{insight.summary}</p>
                    <div className="flex flex-wrap gap-2 items-center mt-1">
                      <span className="text-xs text-gray-500">
                        Confidence: {formatPercent(insight.confidenceScore ?? 0, 0)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {insight.timestamp ? `Detected: ${formatDate(insight.timestamp)}` : 'Fresh'}
                      </span>
                      <span className="text-xs text-blue-500 ml-2">
                        {insight.dataSource ? `Source: ${insight.dataSource}` : ''}
                      </span>
                    </div>
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
                No AI insights available. This can happen if:
                <br />
                – The AI model has not yet analyzed enough data.
                <br />
                – No patterns, risks, or anomalies were detected.
                <br />
                – Data is missing or incomplete.
                <br />
                <span className="block mt-2 text-blue-600">
                  Tip: Upload more invoices, expenses, or bank data to surface insights.
                </span>
                <span className="block mt-2 text-blue-700">
                  <span className="font-semibold">Disclaimer:</span> All insights are AI-generated
                  and for informational purposes only.{' '}
                  <a
                    href="https://www.iso.org/isoiec-23894-ai-risk-management.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    AI responsibility info
                  </a>
                </span>
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
            <div className="sr-only" role="status" aria-live="polite">
              {latestAssistantMessage
                ? `Assistant answered: ${latestAssistantMessage.text}`
                : 'The assistant is ready for your request.'}
            </div>
            {/* Chat area redesign: grouped messages, empty state, typing indicator, error in-chat */}
            <div className="min-h-[220px] max-h-[340px] overflow-y-auto px-1 py-2 bg-gray-50 rounded-lg border border-gray-100 transition-all duration-300 ease-in-out">
              {messages.length === 0 ? (
                <ChatEmptyState />
              ) : (
                groupMessages(messages).map((group, idx) => (
                  <ChatMessageGroup key={idx} group={group} />
                ))
              )}
              {isAsking && <ChatTypingIndicator isAssistant />}
              {userTyping && !isAsking && <ChatTypingIndicator isAssistant={false} />}
            </div>
            <div className="grid gap-3 md:grid-cols-2 mt-2">
              {INTENT_OPTIONS.map((intent) => (
                <Button
                  key={intent.id}
                  variant="primary"
                  size="md"
                  disabled={isAsking}
                  onClick={() => handleIntent(intent.id)}
                  className="justify-start text-left transition-all duration-200 hover:scale-[1.02] focus:scale-[1.01]"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{intent.label}</span>
                    <span className="text-xs text-gray-100 opacity-80">{intent.description}</span>
                  </div>
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supported intents: {INTENT_OPTIONS.map((intent) => intent.label).join(', ')}.
            </p>
            {/* Optionally, add a textarea for freeform input (not just intent buttons) */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 transition-shadow duration-200"
                placeholder="Ask a question or describe your focus..."
                onChange={handleUserInput}
                onFocus={handleUserInput}
                onBlur={() => setUserTyping(false)}
                disabled={isAsking}
                aria-label="Type your question"
              />
              <Button
                variant="primary"
                size="sm"
                disabled={isAsking}
                onClick={() => handleIntent('review')}
                className="ml-2 transition-all duration-200 hover:scale-105"
              >
                Send
              </Button>
            </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="transition-all duration-200 hover:scale-105"
            >
              Refresh assistant
            </Button>
          </Card>
        </div>
      </div>
    </FeatureGate>
  );
};

export default AIAssistant;
