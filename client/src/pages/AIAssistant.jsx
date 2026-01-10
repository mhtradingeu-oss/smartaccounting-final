import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InfoTooltip from '../components/ui/InfoTooltip';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import FeatureGate from '../components/FeatureGate';
import AITrustBanner from '../components/AITrustBanner';
import { AIBadge } from '../components/AIBadge';
import AISeverityPill from '../components/AISeverityPill';
import AIMetadataLine from '../components/AIMetadataLine';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { isReadOnlyRole } from '../lib/permissions';
import { formatCurrency, formatDate, formatPercent, truncateText } from '../lib/utils/formatting';
import { aiAssistantAPI } from '../services/aiAssistantAPI';
import { isAIAssistantEnabled, isAIVoiceEnabled } from '../lib/featureFlags';
import { formatApiError } from '../services/api';
import ChatMessageGroup from '../components/ChatMessageGroup';
import ChatEmptyState from '../components/ChatEmptyState';
import ChatTypingIndicator from '../components/ChatTypingIndicator';
import MutationIntentGuard, { detectMutationIntent } from '../components/MutationIntentGuard';

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

const VOICE_CONSENT_KEY = 'ai_voice_consent_v1';

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
  const [draftMessage, setDraftMessage] = useState('');
  const [inputError, setInputError] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceTranscriptDraft, setVoiceTranscriptDraft] = useState('');
  const [voiceIntent, setVoiceIntent] = useState('review');
  const [voiceError, setVoiceError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceConsentAccepted, setVoiceConsentAccepted] = useState(false);
  const [showVoiceConsent, setShowVoiceConsent] = useState(false);
  const initialMessageSent = useRef(false);
  const lastLoadedCompanyIdRef = useRef(null);
  const recognitionRef = useRef(null);
  const aiAssistantEnabled = isAIAssistantEnabled();
  const aiVoiceEnabled = isAIVoiceEnabled();
  const userRole = user?.role || 'viewer';
  const isReadOnly = isReadOnlyRole(userRole);
  const aiFeatureGateProps = {
    enabled: aiAssistantEnabled,
    featureName: 'AI Assistant',
    description: 'Enable AI_ASSISTANT_ENABLED to open the conversational advisor.',
    ctaLabel: 'Back to dashboard',
    ctaPath: '/dashboard',
  };

  const speechSupported = useMemo(() => {
    if (!aiVoiceEnabled || typeof window === 'undefined') {
      return false;
    }
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, [aiVoiceEnabled]);

  const trustItems = useMemo(() => {
    const items = [
      'AI outputs are advisory only and never execute actions.',
      'All interactions are logged to the audit trail.',
      'Access and visibility depend on role and feature flags.',
    ];
    if (aiVoiceEnabled) {
      items.push('Voice input is transcript-only; raw audio is not stored without consent.');
    }
    return items;
  }, [aiVoiceEnabled]);

  const contextSources = useMemo(() => {
    if (!context) {
      return 'Not available';
    }
    const sources = [];
    if (context.invoices?.length) {
      sources.push('Invoices');
    }
    if (context.expenses?.length) {
      sources.push('Expenses');
    }
    if (context.bankTransactions?.length) {
      sources.push('Bank transactions');
    }
    if (context.insights?.length) {
      sources.push('AI insights');
    }
    return sources.length ? sources.join(', ') : 'Accounting data';
  }, [context]);

  const latestContextTimestamp = useMemo(() => {
    if (!context) {
      return null;
    }
    const candidates = [];
    context.insights?.forEach((insight) => {
      if (insight.lastEvaluated || insight.updatedAt || insight.createdAt) {
        candidates.push(insight.lastEvaluated || insight.updatedAt || insight.createdAt);
      }
    });
    context.invoices?.forEach((invoice) => {
      if (invoice.date || invoice.dueDate) {
        candidates.push(invoice.date || invoice.dueDate);
      }
    });
    context.expenses?.forEach((expense) => {
      if (expense.expenseDate) {
        candidates.push(expense.expenseDate);
      }
    });
    context.bankTransactions?.forEach((transaction) => {
      if (transaction.transactionDate) {
        candidates.push(transaction.transactionDate);
      }
    });
    const parsed = candidates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b - a);
    return parsed[0] || null;
  }, [context]);

  const trustSummary = useMemo(() => {
    const base = 'AI outputs are advisory only and do not change your data.';
    if (!isReadOnly) {
      return base;
    }
    const roleMessage =
      ROLE_LIMITATIONS[userRole]?.message ||
      'You have read-only access. The AI assistant provides explanations and summaries only.';
    return `${roleMessage} ${base}`;
  }, [isReadOnly, userRole]);

  const buildAssistantMeta = useCallback(
    ({ targetInsightId } = {}) => {
      const insight =
        targetInsightId && context?.insights
          ? context.insights.find((item) => String(item.id) === String(targetInsightId))
          : context?.insights?.[0];
      const source = insight?.dataSource || contextSources;
      const rawConfidence = insight?.confidenceScore;
      const confidence = Number.isFinite(Number(rawConfidence))
        ? Number(rawConfidence) > 1
          ? `${Math.round(Number(rawConfidence))}%`
          : formatPercent(Number(rawConfidence), 0)
        : 'Not available';
      const rawDate =
        insight?.lastEvaluated || insight?.updatedAt || insight?.createdAt || latestContextTimestamp;
      const lastUpdated =
        rawDate && !Number.isNaN(new Date(rawDate).getTime())
          ? formatDate(rawDate)
          : 'Not available';
      return {
        source,
        confidence,
        lastUpdated,
      };
    },
    [context, contextSources, latestContextTimestamp],
  );

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
    setVoiceTranscript('');
    setVoiceTranscriptDraft('');
    setVoiceError(null);
    setIsListening(false);
    setDraftMessage('');
    setInputError(null);
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
          aiAssistantAPI.startSession({ companyId: activeCompanyId }),
          aiAssistantAPI.getContext({ companyId: activeCompanyId }),
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
    if (!aiVoiceEnabled || typeof window === 'undefined') {
      setVoiceConsentAccepted(false);
      return;
    }
    const stored = localStorage.getItem(VOICE_CONSENT_KEY);
    setVoiceConsentAccepted(stored === 'true');
  }, [aiVoiceEnabled]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && typeof recognitionRef.current.abort === 'function') {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!context || initialMessageSent.current) {
      return;
    }
    const intro = initialMessageText(context);
    setMessages([
      {
        id: 'assistant-intro',
        speaker: 'assistant',
        text: intro,
        meta: buildAssistantMeta(),
      },
    ]);
    initialMessageSent.current = true;
  }, [context, buildAssistantMeta]);

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
    const nextValue = e.target.value;
    setDraftMessage(nextValue);
    setUserTyping(!!nextValue);
    if (inputError) {
      setInputError(null);
    }
  };

  const ensureVoiceConsent = () => {
    if (voiceConsentAccepted) {
      return true;
    }
    setShowVoiceConsent(true);
    return false;
  };

  const stopVoiceCapture = () => {
    if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
      recognitionRef.current.stop();
    }
  };

  const startVoiceCapture = () => {
    if (!ensureVoiceConsent()) {
      return;
    }
    if (!speechSupported || typeof window === 'undefined') {
      setVoiceError('Speech-to-text is not available in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech-to-text is not available in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
      setVoiceTranscript(transcript);
      setVoiceTranscriptDraft(transcript);
      setVoiceError(null);
    };
    recognition.onerror = (event) => {
      setVoiceError(event?.error ? `Speech-to-text error: ${event.error}` : 'Speech-to-text failed.');
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    setVoiceError(null);
    setIsListening(true);
    recognition.start();
  };

  const handleIntent = async (intentId, options = {}) => {
    const promptText =
      options.prompt || INTENT_OPTIONS.find((intent) => intent.id === intentId)?.label;
    if (promptText && detectMutationIntent(promptText)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          speaker: 'assistant',
          text: '',
          error:
            'This assistant is read-only. I can explain and summarize, but I cannot modify records.',
          timestamp: new Date().toLocaleTimeString(),
          meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
        },
      ]);
      return;
    }
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
          meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
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
          meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
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
        companyId: activeCompanyId,
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
          meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
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
          meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleVoiceSend = async () => {
    if (!ensureVoiceConsent()) {
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
          meta: buildAssistantMeta({ targetInsightId: null }),
        },
      ]);
      return;
    }
    const transcript = voiceTranscriptDraft.trim();
    if (!transcript) {
      setVoiceError('Transcript is empty. Try recording again.');
      return;
    }
    if (detectMutationIntent(transcript)) {
      setVoiceError('Voice requests must be read-only. Please ask for explanations or summaries.');
      return;
    }
    setIsAsking(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        speaker: 'user',
        text: transcript,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setUserTyping(false);
    setVoiceError(null);
    try {
      const response = await aiAssistantAPI.askVoice({
        intent: voiceIntent,
        transcript,
        sessionId,
        responseMode: 'text',
        companyId: activeCompanyId,
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
          meta: buildAssistantMeta({ targetInsightId: null }),
        },
      ]);
      setVoiceTranscript('');
      setVoiceTranscriptDraft('');
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          speaker: 'assistant',
          text: '',
          error: formatApiError(err, 'Unable to reach the assistant.').message,
          timestamp: new Date().toLocaleTimeString(),
          meta: buildAssistantMeta({ targetInsightId: null }),
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
          <div className="flex items-start gap-3">
            <AIBadge label="AI" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Advisory only
            </span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Accounting Assistant</h1>
              <p className="text-sm text-gray-500">
                A read-only advisor that highlights issues and links to explainable insights.
              </p>
            </div>
          </div>
          <AITrustBanner summary={trustSummary} items={trustItems} />
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">Next steps</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/ai-advisor')}>
                View AI Insights
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/audit-logs')}>
                Open Audit Logs
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
                Review Related Invoices
              </Button>
            </div>
          </div>
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate {...aiFeatureGateProps}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AIBadge label="AI" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Advisory only
            </span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Accounting Assistant</h1>
              <p className="text-sm text-gray-500">
                A conversational advisor that highlights issues and connects to explainable
                insights.
                <span className="block mt-1 text-xs text-gray-400">
                  Role access: {ROLE_LIMITATIONS[userRole]?.label || 'User'}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div className="font-semibold text-gray-700">Session ID</div>
            <span className="font-mono text-gray-700">
              {sessionId ? sessionId.slice(0, 8) : 'pending...'}
            </span>
          </div>
        </div>
        <AITrustBanner summary={trustSummary} items={trustItems} />

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
                      <AISeverityPill severity={insight.severity} />
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{insight.summary}</p>
                    <AIMetadataLine
                      whyMatters={truncateText(
                        insight.why || insight.summary || 'Review this insight for next steps.',
                        120,
                      )}
                      dataSource={insight.dataSource || 'Invoices, expenses, and transactions'}
                      lastEvaluated={insight.lastEvaluated || insight.updatedAt || insight.timestamp}
                      className="mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      Confidence:{' '}
                      {Number.isFinite(Number(insight.confidenceScore))
                        ? formatPercent(insight.confidenceScore ?? 0, 0)
                        : 'Not available'}
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
                No AI insights available yet. This can happen if:
                <br />
                - The AI model has not yet analyzed enough data.
                <br />
                - No patterns, risks, or anomalies were detected.
                <br />
                - Data is missing or incomplete.
                <br />
                <span className="block mt-2 text-blue-600">
                  Tip: Upload more invoices, expenses, or bank data to surface insights.
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
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <div className="font-semibold text-gray-700">System hints</div>
              <div className="mt-1">
                Allowed: explain insights, summarize risks, highlight overdue or unreconciled items.
              </div>
              <div className="mt-1">
                Blocked: creating, editing, deleting, filing, or submitting records.
              </div>
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
                value={draftMessage}
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
                onClick={() => {
                  const prompt = draftMessage.trim();
                  if (!prompt) {
                    setInputError('Enter a question to send.');
                    return;
                  }
                  handleIntent('review', { prompt });
                  setDraftMessage('');
                }}
                className="ml-2 transition-all duration-200 hover:scale-105"
              >
                Send
              </Button>
              {aiVoiceEnabled && speechSupported && (
                <Button
                  variant={isListening ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={isAsking}
                  onClick={() => (isListening ? stopVoiceCapture() : startVoiceCapture())}
                  className="transition-all duration-200 hover:scale-105"
                  aria-label={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  {isListening ? 'Stop' : 'Mic'}
                </Button>
              )}
            </div>
            {aiVoiceEnabled && !speechSupported && (
              <div className="text-xs text-gray-500">
                Voice input is unavailable in this browser. Use text input instead.
              </div>
            )}
            {inputError && <div className="text-xs text-red-600">{inputError}</div>}
            {draftMessage && <MutationIntentGuard prompt={draftMessage} />}
            {aiVoiceEnabled && voiceTranscriptDraft && (
              <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                <div className="font-semibold text-blue-800">Transcript preview</div>
                <textarea
                  className="mt-2 w-full rounded border border-blue-200 bg-white p-2 text-sm text-gray-800"
                  rows={3}
                  value={voiceTranscriptDraft}
                  onChange={(event) => setVoiceTranscriptDraft(event.target.value)}
                  aria-label="Voice transcript preview"
                  disabled={isAsking}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-blue-800">
                    Intent
                    <select
                      className="ml-2 rounded border border-blue-200 bg-white px-2 py-1 text-xs"
                      value={voiceIntent}
                      onChange={(event) => setVoiceIntent(event.target.value)}
                      disabled={isAsking}
                    >
                      {INTENT_OPTIONS.map((intent) => (
                        <option key={intent.id} value={intent.id}>
                          {intent.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isAsking || !voiceTranscriptDraft.trim()}
                    onClick={handleVoiceSend}
                  >
                    Send transcript
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isAsking}
                    onClick={() => {
                      setVoiceTranscript('');
                      setVoiceTranscriptDraft('');
                      setVoiceError(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
                {voiceError && <div className="mt-2 text-xs text-red-600">{voiceError}</div>}
                {!voiceError && voiceTranscript && (
                  <div className="mt-2 text-[11px] text-blue-700">
                    Review the transcript before sending. Only text is transmitted.
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Session tracking</h3>
            <p className="text-sm text-gray-600">
              Use this session ID when reviewing audit logs or contacting support.
            </p>
            <p className="text-xs text-gray-500">
              Session ID: {sessionId ? sessionId : 'pending...'}
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
      <Modal
        open={showVoiceConsent}
        onClose={() => setShowVoiceConsent(false)}
        title="Voice Assistant Consent"
        ariaLabel="Voice assistant consent dialog"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Voice input is optional and transcript-only. Your browser converts speech to text
            locally before sending; raw audio is not stored by default.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowVoiceConsent(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                localStorage.setItem(VOICE_CONSENT_KEY, 'true');
                setVoiceConsentAccepted(true);
                setShowVoiceConsent(false);
              }}
            >
              I agree
            </Button>
          </div>
        </div>
      </Modal>
    </FeatureGate>
  );
};

export default AIAssistant;
