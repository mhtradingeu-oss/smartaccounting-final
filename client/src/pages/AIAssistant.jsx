import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpIcon,
  CameraIcon,
  MicrophoneIcon,
  PaperClipIcon,
  StopIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import InfoTooltip from '../components/ui/InfoTooltip';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
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
import { analyzeIntake } from '../services/ocrAPI';
import { expensesAPI } from '../services/expensesAPI';
import { invoicesAPI } from '../services/invoicesAPI';
import { isAIAssistantEnabled } from '../lib/featureFlags';
import { formatApiError } from '../services/api';
import ChatEmptyState from '../components/ChatEmptyState';
import ChatTypingIndicator from '../components/ChatTypingIndicator';
import MutationIntentGuard, { detectMutationIntent } from '../components/MutationIntentGuard';
import PlanRestrictedState from '../components/PlanRestrictedState';
import {
  buildLocalGreetingAnswer,
  buildPromptForIntent,
  formatAssistantAnswer,
  inferAssistantIntent,
  isGeneralSmallTalk,
  isGreetingMessage,
} from '../lib/aiChatIntent';
import {
  buildAttachmentChip,
  formatAttachmentSize,
  isSupportedDocumentAttachment,
} from '../lib/aiChatAttachments';

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

const MAX_PROMPT_LENGTH = 8000;
const STARTUP_TIMEOUT_MS = 10000;

const withStartupTimeout = (promise, label) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Please try again.`));
    }, STARTUP_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
};

const initialMessageText = (context) => {
  if (!context) {
    return 'مرحبًا، أنا مساعدك المحاسبي. اسألني عن الفواتير، المخاطر، المعاملات البنكية، أو سبب ظهور تنبيه. إجاباتي استشارية فقط ولا أغير أي بيانات.';
  }
  const insightCount = context.insights?.length ?? 0;
  const invoiceCount = context.invoices?.length ?? 0;
  const transactionCount = context.bankTransactions?.length ?? 0;
  return `مرحبًا، كيف أقدر أساعدك اليوم؟ أراقب ${context.company?.name ?? 'شركتك'} بشكل استشاري فقط: ${insightCount} insights, ${invoiceCount} invoices, ${transactionCount} transactions.`;
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
  const { t } = useTranslation();
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
  const [showRequestIds, setShowRequestIds] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState(null);
  const [documentIntakeProgress, setDocumentIntakeProgress] = useState(null);
  const [draftCreationStatus, setDraftCreationStatus] = useState(null);
  const initialMessageSent = useRef(false);
  const lastLoadedCompanyIdRef = useRef(null);
  const streamAbortRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const aiAssistantEnabled = isAIAssistantEnabled();
  const userRole = user?.role || 'viewer';
  const isSystemAdmin =
    userRole === 'admin' && (user?.companyId === null || user?.companyId === undefined);
  const isReadOnly = isReadOnlyRole(userRole);
  const supportsStreaming = useMemo(
    () => typeof window !== 'undefined' && typeof window.fetch === 'function' && !!window.ReadableStream,
    [],
  );
  const aiFeatureGateProps = {
    enabled: aiAssistantEnabled,
    featureName: 'AI Assistant',
    description: 'Enable AI_ASSISTANT_ENABLED to open the conversational advisor.',
    ctaLabel: 'Back to dashboard',
    ctaPath: '/dashboard',
  };

  const mediaRecorderSupported = useMemo(
    () => typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined',
    [],
  );

  const trustItems = useMemo(() => {
    const items = [
      'AI outputs are advisory only and never execute actions.',
      'All interactions are logged to the audit trail.',
      'Access and visibility depend on role and feature flags.',
    ];
    items.push('Voice recordings stay local as advisory attachments unless a transcript path is connected.');
    return items;
  }, []);

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
    setDraftMessage('');
    setInputError(null);
    setAttachments([]);
    setIsRecording(false);
    setRecordingSeconds(0);
    setRecordingError(null);
    setDocumentIntakeProgress(null);
  };

  useEffect(() => {
    const prepareForLoad = () => {
      aiAssistantAPI.reset();
      resetAssistantState();
    };

    // If AI is disabled, no company, or user is read-only, do not call AI APIs
    if (!aiAssistantEnabled || !activeCompanyId || isReadOnly || isSystemAdmin) {
      prepareForLoad();
      setLoading(false);
      lastLoadedCompanyIdRef.current = null;
      return;
    }

    if (lastLoadedCompanyIdRef.current === activeCompanyId && context) {
      setLoading(false);
      return;
    }

    const requestedCompanyId = activeCompanyId;
    prepareForLoad();

    let cancelled = false;

    const loadAssistantData = async () => {
      setLoading(true);
      try {
        const [sessionResult, contextResult] = await Promise.allSettled([
          withStartupTimeout(
            aiAssistantAPI.startSession({ companyId: activeCompanyId }),
            'AI assistant session',
          ),
          withStartupTimeout(
            aiAssistantAPI.getContext({ companyId: activeCompanyId }),
            'AI assistant context',
          ),
        ]);

        if (cancelled) {
          return;
        }

        if (sessionResult.status === 'rejected') {
          setContextError(
            formatApiError(sessionResult.reason, 'Unable to start the AI assistant session.'),
          );
          return;
        }

        if (contextResult.status === 'rejected') {
          setSessionId(sessionResult.value?.sessionId ?? null);
          setContextError(
            formatApiError(contextResult.reason, 'Unable to load the AI assistant context.'),
          );
          return;
        }

        setSessionId(sessionResult.value?.sessionId ?? null);
        setContext(contextResult.value || {});
        lastLoadedCompanyIdRef.current = requestedCompanyId;
      } catch (err) {
        if (!cancelled) {
          setContextError(formatApiError(err, 'Unable to load the AI assistant.'));
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
  }, [aiAssistantEnabled, activeCompanyId, isReadOnly, isSystemAdmin, context]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
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
        role: 'assistant',
        text: intro,
        createdAt: new Date().toISOString(),
        requestId: null,
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

  if (isSystemAdmin) {
    return (
      <FeatureGate {...aiFeatureGateProps}>
        <EmptyState
          title={t('states.ai_assistant_system_admin_blocked.title')}
          description={t('states.ai_assistant_system_admin_blocked.description')}
          help={t('states.ai_assistant_system_admin_blocked.help')}
        />
      </FeatureGate>
    );
  }

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

  // Handle user input for typing indicator
  const handleUserInput = (e) => {
    const nextValue = e.target.value;
    setDraftMessage(nextValue);
    setUserTyping(!!nextValue);
    if (inputError) {
      setInputError(null);
    }
  };

  const addFiles = (fileList, kind = 'file') => {
    const nextFiles = Array.from(fileList || []).map((file) => buildAttachmentChip(file, kind));
    if (!nextFiles.length) {
      return;
    }
    setAttachments((prev) => [...prev, ...nextFiles]);
    setRecordingError(null);
  };

  const removeAttachment = (attachmentId) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const stopLocalRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setIsRecording(false);
  };

  const cancelLocalRecording = () => {
    recordingChunksRef.current = [];
    stopLocalRecording();
    setRecordingSeconds(0);
  };

  const startLocalRecording = async () => {
    if (!mediaRecorderSupported) {
      setRecordingError('Voice recording is not available in this browser.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Microphone access is not available in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      recordingChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        if (chunks.length) {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const file = new File([blob], `voice-recording-${Date.now()}.webm`, {
            type: blob.type || 'audio/webm',
          });
          setAttachments((prev) => [...prev, buildAttachmentChip(file, 'audio')]);
        }
        recordingChunksRef.current = [];
      };
      recorder.start();
      setRecordingError(null);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setRecordingError(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : 'Unable to start voice recording.',
      );
      setIsRecording(false);
    }
  };

  const addLocalAssistantMessage = (answer, options = {}) => {
    const formatted = formatAssistantAnswer(answer);
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        speaker: 'assistant',
        role: 'assistant',
        text: formatted.message,
        highlights: formatted.highlights,
        risks: formatted.risks,
        requiredActions: formatted.requiredActions,
        references: formatted.references,
        evidenceReferences: formatted.evidenceReferences,
        confidence: formatted.confidence,
        contextSummary: formatted.contextSummary,
        requestId: options.requestId ?? null,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString(),
        meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
      },
    ]);
  };

  const addUserMessage = (text, messageAttachments = []) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        speaker: 'user',
        role: 'user',
        text,
        attachments: messageAttachments,
        createdAt: new Date().toISOString(),
        requestId: null,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const inferLanguageHint = (text = '') => {
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'ar';
    }
    if (/[äöüßÄÖÜ]|\b(rechnung|quittung|kontoauszug|steuer)\b/i.test(text)) {
      return 'de';
    }
    return 'auto';
  };

  const getDocumentIntro = (text = '') => {
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'قرأت المستند واستخرجت اقتراحًا محاسبيًا للمراجعة فقط. راجع الحقول قبل إنشاء أي مسودة.';
    }
    if (/[äöüßÄÖÜ]|\b(rechnung|quittung|kontoauszug|steuer)\b/i.test(text)) {
      return 'Ich habe das Dokument gelesen und einen unverbindlichen Buchhaltungsvorschlag erstellt. Bitte prüfe die Felder vor jeder Entwurfserstellung.';
    }
    return 'I read the document and prepared an advisory accounting suggestion. Review extracted fields before creating any draft.';
  };

  const addDocumentAnalysisMessage = (analysis, userText = '') => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-document-${Date.now()}`,
        speaker: 'assistant',
        role: 'assistant',
        text: getDocumentIntro(userText),
        documentAnalysis: analysis,
        requestId: analysis?.requestId ?? null,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toLocaleTimeString(),
        meta: buildAssistantMeta(),
      },
    ]);
  };

  const handleDocumentIntake = async ({ prompt, messageAttachments }) => {
    const supportedAttachment = messageAttachments.find(isSupportedDocumentAttachment);
    if (!supportedAttachment?.file) {
      addUserMessage(prompt || 'I added an attachment.', messageAttachments);
      addLocalAssistantMessage({
        message:
          'File analysis is available for PDF, JPEG, PNG, and TIFF documents. I can still help based on your text.',
        highlights: ['Audio recordings and unsupported files are not sent for document intake analysis.'],
        references: ['Read-only assistant guidance'],
      });
      return;
    }

    addUserMessage(prompt || 'Analyze this accounting document.', messageAttachments);
    setUserTyping(false);
    setIsAsking(true);
    const steps = [
      'Uploading document',
      'Reading document',
      'Classifying document',
      'Validating suggestion',
    ];
    try {
      setDocumentIntakeProgress(steps[0]);
      await Promise.resolve();
      setDocumentIntakeProgress(steps[1]);
      await Promise.resolve();
      setDocumentIntakeProgress(steps[2]);
      const result = await analyzeIntake(supportedAttachment.file, {
        documentType: 'auto',
        languageHint: inferLanguageHint(prompt),
        userHint: prompt,
        companyId: activeCompanyId,
      });
      setDocumentIntakeProgress(steps[3]);
      addDocumentAnalysisMessage(result, prompt);
    } catch (err) {
      const message = formatApiError(
        err,
        'Unable to analyze the document. The attachment was not used to create or change accounting records.',
      ).message;
      addLocalAssistantMessage({
        message,
        highlights: [
          'No invoice, expense, bank transaction, posting, approval, deletion, or reconciliation was created.',
        ],
        references: ['AI document intake advisory path'],
      });
    } finally {
      setDocumentIntakeProgress(null);
      setIsAsking(false);
    }
  };

  const handleIntent = async (intentId, options = {}) => {
    const promptText =
      options.prompt || INTENT_OPTIONS.find((intent) => intent.id === intentId)?.label;
    if (promptText && promptText.length > MAX_PROMPT_LENGTH) {
      setInputError('Your message exceeds the 8000 character limit.');
      return;
    }
    if (promptText && detectMutationIntent(promptText)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          speaker: 'assistant',
          role: 'assistant',
          text: '',
          error:
            'This assistant is read-only. I can explain and summarize, but I cannot modify records.',
          createdAt: new Date().toISOString(),
          requestId: null,
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
          role: 'assistant',
          text: '',
          error: 'Your role does not permit interacting with the AI assistant.',
          createdAt: new Date().toISOString(),
          requestId: null,
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
          role: 'assistant',
          text: '',
          error: 'Session is initializing. Please wait a moment.',
          createdAt: new Date().toISOString(),
          requestId: null,
          timestamp: new Date().toLocaleTimeString(),
          meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
        },
      ]);
      return;
    }
    const intentMeta = INTENT_OPTIONS.find((intent) => intent.id === intentId);
    const rawPrompt = options.prompt || intentMeta?.label || intentId;
    const messageAttachments = options.attachments || [];
    const routedIntent = inferAssistantIntent(rawPrompt, options.selectedQuickAction ? intentId : null);
    const prompt = buildPromptForIntent({
      text: rawPrompt,
      intent: routedIntent,
      pageContext: context,
      attachments: messageAttachments,
    });

    if (routedIntent === 'general_chat') {
      addUserMessage(rawPrompt, messageAttachments);
      setUserTyping(false);
      const localAnswer =
        isGreetingMessage(rawPrompt) || isGeneralSmallTalk(rawPrompt)
          ? buildLocalGreetingAnswer()
          : {
              message:
                'I can help conversationally and keep the advice read-only. Ask me about invoices, accounting risks, bank transactions, or why an insight was flagged.',
              highlights: messageAttachments.length
                ? ['File analysis is not connected yet; I can still help based on your text.']
                : ['No accounting records are changed from this chat.'],
              references: ['Read-only assistant guidance'],
              confidence: 'High',
            };
      addLocalAssistantMessage(localAnswer, { targetInsightId: options.targetInsightId });
      return;
    }

    const sendNonStreaming = async ({ includeUserMessage = true } = {}) => {
      setIsAsking(true);
      if (includeUserMessage) {
        addUserMessage(rawPrompt, messageAttachments);
      }
      setUserTyping(false);
      try {
        const response = await aiAssistantAPI.askIntent({
          intent: routedIntent,
          prompt,
          targetInsightId: options.targetInsightId,
          sessionId,
          companyId: activeCompanyId,
        });
        addLocalAssistantMessage(response?.answer ?? {}, {
          requestId: response?.requestId ?? null,
          targetInsightId: options.targetInsightId,
        });
      } catch (err) {
        const errorRequestId = err?.response?.data?.requestId ?? null;
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            speaker: 'assistant',
            role: 'assistant',
            text: '',
            error: formatApiError(err, 'Unable to reach the assistant.').message,
            requestId: errorRequestId,
            createdAt: new Date().toISOString(),
            timestamp: new Date().toLocaleTimeString(),
            meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
          },
        ]);
      } finally {
        setIsAsking(false);
      }
    };

    if (!supportsStreaming) {
      return sendNonStreaming();
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      role: 'user',
      text: rawPrompt,
      attachments: messageAttachments,
      createdAt: new Date().toISOString(),
      requestId: null,
      timestamp: new Date().toLocaleTimeString(),
    };
    const assistantMessageId = `assistant-stream-${Date.now()}`;
    const assistantMessage = {
      id: assistantMessageId,
      speaker: 'assistant',
      role: 'assistant',
      text: '',
      highlights: [],
      references: [],
      requestId: null,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString(),
      meta: buildAssistantMeta({ targetInsightId: options.targetInsightId }),
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setUserTyping(false);
    setIsStreaming(true);
    setIsAsking(true);

    let receivedChunk = false;
    const controller = new AbortController();
    streamAbortRef.current = controller;

    const updateAssistant = (patch) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, ...patch } : msg)),
      );
    };
    const appendAssistantText = (nextText, requestId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                text: `${msg.text || ''}${nextText || ''}`,
                requestId: requestId || msg.requestId || null,
              }
            : msg,
        ),
      );
    };

    try {
      await aiAssistantAPI.askIntentStream({
        intent: routedIntent,
        prompt,
        targetInsightId: options.targetInsightId,
        sessionId,
        companyId: activeCompanyId,
        signal: controller.signal,
        onEvent: ({ event, data }) => {
          if (event === 'chunk') {
            receivedChunk = true;
            appendAssistantText(data?.token, data?.requestId);
          } else if (event === 'error') {
            updateAssistant({
              error: data?.message || 'Streaming error.',
              requestId: data?.requestId || null,
            });
          } else if (event === 'done') {
            updateAssistant({ requestId: data?.requestId || null });
            setIsStreaming(false);
            setIsAsking(false);
          }
        },
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        updateAssistant({ error: 'Streaming canceled.', requestId: null });
      } else if (!receivedChunk) {
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        await sendNonStreaming({ includeUserMessage: false });
        return;
      } else {
        updateAssistant({
          error: formatApiError(err, 'Unable to reach the assistant.').message,
          requestId: err?.response?.data?.requestId ?? null,
        });
      }
    } finally {
      setIsStreaming(false);
      setIsAsking(false);
      streamAbortRef.current = null;
    }
  };

  const renderList = (title, items) => {
    if (!items?.length) {
      return null;
    }
    return (
      <div className="mt-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </div>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-700 dark:text-gray-200">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary-500" />
              <span>{typeof item === 'string' ? item : item?.label || item?.summary || String(item)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };


  const toDraftNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }

    let normalized = String(value).trim().replace(/[^\d,.-]/g, '');

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      normalized = normalized.replace(',', '.');
    }

    const number = Number(normalized);
    return Number.isFinite(number) ? number : fallback;
  };

  const toDraftVatRate = (value) => {
    const number = toDraftNumber(value, 0.19);
    if (!Number.isFinite(number) || number < 0) {
      return 0.19;
    }
    return number > 1 ? number / 100 : number;
  };

  const getDocumentSourceNote = (analysis) => {
    const document = analysis?.document || {};
    const parts = [
      'Created from AI document intake review.',
      document.id ? `Source document ID: ${document.id}.` : null,
      document.originalName ? `Original file: ${document.originalName}.` : null,
      analysis?.requestId ? `AI request ID: ${analysis.requestId}.` : null,
      'Human confirmed draft creation. Advisory AI suggestion only.',
    ].filter(Boolean);
    return parts.join(' ');
  };

  const buildExpenseDraftPayloadFromAnalysis = (analysis) => {
    const extracted = analysis?.extracted || {};
    const classification = analysis?.classification || {};
    const netAmount = toDraftNumber(extracted.netAmount ?? extracted.amount, 0);
    const vatRate = toDraftVatRate(extracted.vatRate);
    const vatAmount = toDraftNumber(extracted.vatAmount, +(netAmount * vatRate).toFixed(2));
    const grossAmount = toDraftNumber(extracted.grossAmount, +(netAmount + vatAmount).toFixed(2));
    const vendorName =
      extracted.vendorName ||
      extracted.supplierName ||
      extracted.merchantName ||
      extracted.counterpartyName ||
      'Unknown vendor';

    return {
      companyId: activeCompanyId,
      vendorName,
      description:
        extracted.description ||
        extracted.documentNumber ||
        `AI document intake draft for ${vendorName}`,
      category: classification.category || extracted.category || 'general',
      expenseDate:
        extracted.documentDate ||
        extracted.invoiceDate ||
        extracted.date ||
        new Date().toISOString().slice(0, 10),
      currency: extracted.currency || 'EUR',
      netAmount,
      vatRate,
      vatAmount,
      grossAmount,
      status: 'pending',
      source: 'ai_document_intake',
      notes: getDocumentSourceNote(analysis),
    };
  };

  const buildInvoiceDraftPayloadFromAnalysis = (analysis) => {
    const extracted = analysis?.extracted || {};
    const classification = analysis?.classification || {};
    const netAmount = toDraftNumber(extracted.netAmount ?? extracted.amount, 0);
    const vatRate = toDraftVatRate(extracted.vatRate);
    const clientName =
      extracted.customerName ||
      extracted.clientName ||
      extracted.buyerName ||
      extracted.counterpartyName ||
      'Review customer';

    return {
      companyId: activeCompanyId,
      clientName,
      date:
        extracted.documentDate ||
        extracted.invoiceDate ||
        extracted.date ||
        new Date().toISOString().slice(0, 10),
      dueDate:
        extracted.dueDate ||
        extracted.documentDate ||
        extracted.invoiceDate ||
        extracted.date ||
        new Date().toISOString().slice(0, 10),
      currency: extracted.currency || 'EUR',
      status: 'draft',
      notes: getDocumentSourceNote(analysis),
      items: [
        {
          description:
            extracted.description ||
            classification.category ||
            extracted.documentNumber ||
            'AI document intake line item',
          quantity: 1,
          unitPrice: netAmount,
          vatRate,
        },
      ],
    };
  };

  const handleCreateDraftFromAnalysis = async (analysis) => {
    if (!analysis || isReadOnly || !activeCompanyId) {
      return;
    }

    const suggestedAction = analysis.classification?.suggestedAction;
    const isExpenseDraft = suggestedAction === 'create_expense_draft';
    const isInvoiceDraft = suggestedAction === 'create_invoice_draft';

    if (!isExpenseDraft && !isInvoiceDraft) {
      addLocalAssistantMessage({
        message:
          'This document needs review or correction before a draft can be created. No accounting record was changed.',
        highlights: ['Resolve validation warnings and missing fields before confirming a draft.'],
        references: ['AI document intake safety policy'],
      });
      return;
    }

    setDraftCreationStatus('Creating draft...');
    setIsAsking(true);

    try {
      if (isExpenseDraft) {
        const result = await expensesAPI.create(buildExpenseDraftPayloadFromAnalysis(analysis));
        const expense = result?.expense || result?.data?.expense || result;
        addLocalAssistantMessage({
          message:
            'Expense draft created after your confirmation. Please review it before booking or posting.',
          highlights: [
            `Draft expense: ${expense?.vendorName || expense?.vendor || 'Created expense draft'}`,
            'The original document was not automatically posted, approved, deleted, or reconciled.',
          ],
          references: ['Created through existing Expenses API', analysis?.document?.id].filter(Boolean),
        });
      }

      if (isInvoiceDraft) {
        const invoice = await invoicesAPI.create(buildInvoiceDraftPayloadFromAnalysis(analysis));
        addLocalAssistantMessage({
          message:
            'Invoice draft created after your confirmation. Please review it before issuing or sending.',
          highlights: [
            `Draft invoice: ${invoice?.clientName || 'Created invoice draft'}`,
            'The original document was not automatically issued, posted, approved, deleted, or reconciled.',
          ],
          references: ['Created through existing Invoices API', analysis?.document?.id].filter(Boolean),
        });
      }
    } catch (err) {
      const message = formatApiError(
        err,
        'Unable to create a draft from this document. No accounting record was changed.',
      ).message;
      addLocalAssistantMessage({
        message,
        highlights: ['No invoice, expense, posting, approval, deletion, or reconciliation was created.'],
        references: ['AI document intake confirmation path'],
      });
    } finally {
      setDraftCreationStatus(null);
      setIsAsking(false);
    }
  };


  const renderDocumentAnalysis = (analysis) => {
    if (!analysis) {
      return null;
    }
    const extractedEntries = Object.entries(analysis.extracted || {}).filter(
      ([key, value]) =>
        !['raw', 'lineItems'].includes(key) &&
        value !== null &&
        value !== undefined &&
        value !== '',
    );
    const validation = analysis.validation || {};
    return (
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
              Document analysis
            </div>
            <div className="mt-1 text-lg font-semibold">
              {analysis.classification?.documentType || 'document'} ·{' '}
              {analysis.classification?.suggestedAction || 'ask_missing_data'}
            </div>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-slate-950 dark:text-blue-200 dark:ring-blue-900">
            Confidence: {analysis.classification?.confidence || 'not available'}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {extractedEntries.length ? (
            extractedEntries.slice(0, 12).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-blue-100 bg-white px-3 py-2 dark:border-blue-900 dark:bg-slate-950"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                  {key}
                </div>
                <div className="mt-1 break-words text-sm text-gray-800 dark:text-gray-100">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-blue-800 dark:text-blue-100">
              No structured fields were detected.
            </p>
          )}
        </div>

        {!!validation.errors?.length && renderList('Validation errors', validation.errors)}
        {!!validation.warnings?.length && renderList('Validation warnings', validation.warnings)}
        {!!validation.missingFields?.length &&
          renderList('Missing fields', validation.missingFields)}

        {!isReadOnly &&
          ['create_expense_draft', 'create_invoice_draft'].includes(
            analysis.classification?.suggestedAction,
          ) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.classification?.suggestedAction === 'create_expense_draft' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isAsking || !!draftCreationStatus}
                  onClick={() => handleCreateDraftFromAnalysis(analysis)}
                >
                  Confirm create expense draft
                </Button>
              )}
              {analysis.classification?.suggestedAction === 'create_invoice_draft' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isAsking || !!draftCreationStatus}
                  onClick={() => handleCreateDraftFromAnalysis(analysis)}
                >
                  Confirm create invoice draft
                </Button>
              )}
              <span className="self-center text-xs text-blue-700 dark:text-blue-200">
                {draftCreationStatus || 'Draft only. Final posting still requires normal review.'}
              </span>
            </div>
          )}

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Advisory-only. Human confirmation is required before any invoice, expense, bank
          transaction, posting, approval, deletion, or reconciliation. Review extracted fields
          before creating any draft.
        </div>
      </div>
    );
  };

  const renderMessage = (message) => {
    const isAssistant = message.speaker === 'assistant';
    const references = [
      ...(message.references || []),
      ...(message.evidenceReferences || []),
    ].filter(Boolean);
    return (
      <div
        key={message.id}
        className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'}`}
      >
        <article
          className={
            isAssistant
              ? 'max-w-[min(760px,92%)] rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80'
              : 'max-w-[min(680px,86%)] rounded-2xl bg-primary-600 px-4 py-3 text-white shadow-sm dark:bg-primary-500'
          }
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                isAssistant ? 'text-primary-700 dark:text-primary-300' : 'text-primary-50'
              }`}
            >
              {isAssistant ? 'Assistant' : 'You'}
            </span>
            {message.timestamp && (
              <span className={isAssistant ? 'text-[11px] text-gray-400' : 'text-[11px] text-primary-100'}>
                {message.timestamp}
              </span>
            )}
          </div>
          {message.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {message.error}
            </div>
          ) : (
            <div
              className={`whitespace-pre-line text-sm leading-7 ${
                isAssistant ? 'text-gray-800 dark:text-gray-100' : 'text-white'
              }`}
            >
              {message.text}
            </div>
          )}
          {!!message.attachments?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.attachments.map((attachment) => (
                <span
                  key={attachment.id}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs text-white ring-1 ring-white/30"
                >
                  {attachment.name}
                </span>
              ))}
            </div>
          )}
          {isAssistant && renderList('Highlights', message.highlights)}
          {isAssistant && renderList('Risks', message.risks)}
          {isAssistant && renderList('Suggested next steps', message.requiredActions)}
          {isAssistant && renderList('References', references)}
          {isAssistant && renderDocumentAnalysis(message.documentAnalysis)}
          {isAssistant && (message.confidence || message.contextSummary || message.meta) && (
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:bg-slate-900 dark:text-gray-400">
              {message.confidence && <span>Confidence: {message.confidence}. </span>}
              {message.contextSummary && <span>{message.contextSummary}. </span>}
              {message.meta && (
                <span>
                  Source: {message.meta.source || 'Not available'} · Confidence:{' '}
                  {message.meta.confidence || 'Not available'} · Last updated:{' '}
                  {message.meta.lastUpdated || 'Not available'}
                </span>
              )}
            </div>
          )}
          {showRequestIds && message.requestId && (
            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              Request ID: {message.requestId}
            </div>
          )}
        </article>
      </div>
    );
  };

  const handleComposerSubmit = () => {
    const prompt = draftMessage.trim();
    if (!prompt && attachments.length === 0) {
      setInputError('Enter a question or add an attachment to send.');
      return;
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      setInputError('Your message exceeds the 8000 character limit.');
      return;
    }
    const outgoingAttachments = attachments;
    setDraftMessage('');
    setAttachments([]);
    setInputError(null);
    if (outgoingAttachments.length) {
      handleDocumentIntake({
        prompt: prompt || 'Analyze this accounting document.',
        messageAttachments: outgoingAttachments,
      });
      return;
    }
    handleIntent(inferAssistantIntent(prompt), {
      prompt: prompt || 'I added an attachment.',
      attachments: outgoingAttachments,
    });
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
    if (contextError.type === 'plan_restricted') {
      return (
        <PlanRestrictedState
          feature="AI assistant"
          message={contextError.message}
          upgradePath={contextError.upgradePath}
        />
      );
    }
    return (
      <>
        <EmptyState
          title="Unable to load the AI assistant"
          description={contextError.message || 'Please try again later.'}
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
        <div className="page-shell">
          <div className="flex items-start gap-3">
            <AIBadge label="AI" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Advisory only
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">AI Accounting Assistant</h1>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
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
      <div className="page-shell">
        <div className="surface-card-ai flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AIBadge label="AI" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Advisory only
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">AI Accounting Assistant</h1>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                A conversational advisor that highlights issues and connects to explainable
                insights.
                <span className="block mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Role access: {ROLE_LIMITATIONS[userRole]?.label || 'User'}
                </span>
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-right text-xs text-gray-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-gray-400">
            <div className="font-semibold text-gray-700 dark:text-gray-200">Session ID</div>
            <span className="font-mono text-gray-700 dark:text-gray-200">
              {sessionId ? sessionId.slice(0, 8) : 'pending...'}
            </span>
          </div>
        </div>
        <AITrustBanner summary={trustSummary} items={trustItems} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-950 dark:text-white">Company context</span>
              <span className="text-xs text-gray-500">Read-only</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{context?.company?.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {context?.company?.city}, {context?.company?.country}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              AI Enabled: {context?.company?.aiEnabled === false ? 'No' : 'Yes'}
            </p>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-gray-950 dark:text-white">Invoices</span>
              <span className="text-xs text-gray-500">
                {context?.invoices?.length ?? 0} records
              </span>
            </div>
            {Object.keys(invoiceStatusBreakdown).length ? (
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
              <span className="font-semibold text-gray-950 dark:text-white">Expenses</span>
              <span className="text-xs text-gray-500">
                {context?.expenses?.length ?? 0} records
              </span>
            </div>
            {Object.keys(expenseStatusBreakdown).length ? (
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
              <span className="font-semibold text-gray-950 dark:text-white">Bank statements</span>
              <span className="text-xs text-gray-500">{unreconciledCount} unreconciled</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
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
              <span className="font-semibold text-gray-950 dark:text-white">AI insights</span>
              <span className="text-xs text-blue-600">Explainable + auditable</span>
            </div>
            {context?.insights?.length ? (
              <div className="space-y-3">
                {context.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-sm font-semibold text-gray-950 dark:text-white">
                        {insight.type}
                        <InfoTooltip
                          text={`Why am I seeing this?\n\nThis insight was generated because: ${insight.why || 'AI detected a pattern or anomaly based on your accounting data.'}\n\nData source: ${insight.dataSource || 'Relevant invoices, transactions, or expenses.'}`}
                        />
                      </span>
                      <AISeverityPill severity={insight.severity} />
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{insight.summary}</p>
                    <AIMetadataLine
                      whyMatters={truncateText(
                        insight.why || insight.summary || 'Review this insight for next steps.',
                        120,
                      )}
                      dataSource={insight.dataSource || 'Invoices, expenses, and transactions'}
                      lastEvaluated={insight.lastEvaluated || insight.updatedAt || insight.timestamp}
                      className="mt-1"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="flex min-h-[680px] flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between">
              <div className="px-5 pt-5">
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">Assistant chat</h2>
                <p className="text-xs text-gray-500 mt-1">
                  The assistant references invoices, expenses, bank statements, and AI insights.
                  Every answer is grounded and audit logged.
                </p>
              </div>
              <span className="mr-5 mt-5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900">
                Read-only advisor
              </span>
            </div>
            <div className="sr-only" role="status" aria-live="polite">
              {latestAssistantMessage
                ? `Assistant answered: ${latestAssistantMessage.text}`
                : 'The assistant is ready for your request.'}
            </div>
            <div className="mt-4 flex-1 space-y-5 overflow-y-auto border-y border-gray-100 bg-gray-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/50">
              {messages.length === 0 ? <ChatEmptyState /> : messages.map(renderMessage)}
              {documentIntakeProgress && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-900 dark:bg-slate-950 dark:text-blue-200">
                    {documentIntakeProgress}…
                  </div>
                </div>
              )}
              {isAsking && <ChatTypingIndicator isAssistant />}
              {userTyping && !isAsking && <ChatTypingIndicator isAssistant={false} />}
            </div>
            <div className="bg-white px-5 py-4 dark:bg-slate-950">
              <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {INTENT_OPTIONS.map((intent) => (
                  <Button
                    key={intent.id}
                    variant="outline"
                    size="sm"
                    disabled={isAsking}
                    onClick={() => handleIntent(intent.id, { selectedQuickAction: true })}
                    className="min-h-[56px] justify-start text-left"
                  >
                    <span className="flex flex-col items-start">
                      <span className="font-semibold">{intent.label}</span>
                      <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                        {intent.id}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {!!attachments.length && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <span
                        key={attachment.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-200"
                      >
                        <span className="truncate">
                          {attachment.name} · {attachment.type || attachment.kind} ·{' '}
                          {formatAttachmentSize(attachment.size)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${attachment.name}`}
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => removeAttachment(attachment.id)}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.tiff"
                    onChange={(event) => {
                      addFiles(event.target.files, 'file');
                      event.target.value = '';
                    }}
                    aria-label="Choose file attachment"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      addFiles(event.target.files, 'image');
                      event.target.value = '';
                    }}
                    aria-label="Capture image attachment"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach file"
                      title="Attach file"
                      disabled={isAsking}
                    >
                      <PaperClipIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      aria-label="Add image from camera"
                      title="Add image from camera"
                      disabled={isAsking}
                    >
                      <CameraIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      variant={isRecording ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => (isRecording ? stopLocalRecording() : startLocalRecording())}
                      aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
                      title={isRecording ? 'Stop voice recording' : 'Start voice recording'}
                      disabled={isAsking}
                    >
                      {isRecording ? (
                        <StopIcon className="h-5 w-5" />
                      ) : (
                        <MicrophoneIcon className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  <textarea
                    className="min-h-[54px] max-h-40 flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                    placeholder="Message the accounting assistant..."
                    value={draftMessage}
                    onChange={handleUserInput}
                    onFocus={handleUserInput}
                    onBlur={() => setUserTyping(false)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        if (!isAsking && (draftMessage.trim() || attachments.length)) {
                          handleComposerSubmit();
                        }
                      }
                    }}
                    disabled={isAsking}
                    aria-label="Type your question"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isAsking || (!draftMessage.trim() && attachments.length === 0)}
                    onClick={handleComposerSubmit}
                    aria-label="Send message"
                    title="Send message"
                  >
                    <ArrowUpIcon className="h-5 w-5" />
                  </Button>
                  {isStreaming && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (streamAbortRef.current) {
                          streamAbortRef.current.abort();
                        }
                        setIsStreaming(false);
                        setIsAsking(false);
                      }}
                      aria-label="Cancel response"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Enter sends. Shift+Enter adds a line. Attachments and recordings stay advisory-only.</span>
                {isRecording && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900">
                    Recording {recordingSeconds}s
                    <button type="button" className="underline" onClick={cancelLocalRecording}>
                      Cancel
                    </button>
                  </span>
                )}
              </div>
            </div>
            {inputError && <div className="text-xs text-red-600">{inputError}</div>}
            {recordingError && <div className="px-5 pb-3 text-xs text-red-600">{recordingError}</div>}
            {!mediaRecorderSupported && (
              <div className="px-5 pb-3 text-xs text-gray-500">
                Voice recording is unavailable in this browser. Text, files, and camera input remain available.
              </div>
            )}
            {!!attachments.length && (
              <div className="px-5 pb-3 text-xs text-gray-500">
                Supported PDF and image attachments will be analyzed for advisory document intake.
                Audio transcription is not connected yet.
              </div>
            )}
            {draftMessage && <MutationIntentGuard prompt={draftMessage} />}
          </Card>

          <Card className="space-y-3">
            <h3 className="text-lg font-bold text-gray-950 dark:text-white">Session tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Use this session ID when reviewing audit logs or contacting support.
            </p>
            <p className="text-xs text-gray-500">
              Session ID: {sessionId ? sessionId : 'pending...'}
            </p>
            {userRole === 'admin' && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 text-left"
                onClick={() => setShowRequestIds((prev) => !prev)}
              >
                {showRequestIds ? 'Hide request IDs' : 'Show request IDs'}
              </button>
            )}
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
