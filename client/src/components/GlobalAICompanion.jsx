import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AIBadge } from './AIBadge';
import { Button } from './ui/Button';
import { useCompany } from '../context/CompanyContext';
import { aiAssistantAPI } from '../services/aiAssistantAPI';
import { formatApiError } from '../services/api';
import { formatAIPageContextForPrompt, getAIPageContext } from '../lib/aiPageContext';

const QUICK_PROMPTS = [
  {
    label: 'What should I review?',
    intent: 'review',
    prompt: 'What should I review in my accounting workspace right now?',
  },
  {
    label: 'Show important risks',
    intent: 'risks',
    prompt: 'Show the important accounting risks for the active company.',
  },
  {
    label: 'Explain this page',
    intent: 'explain_page',
    prompt: 'Explain the current accounting page and what I should pay attention to.',
  },
];

const getAnswerText = (response) =>
  response?.answer?.message ||
  response?.message ||
  response?.answer?.text ||
  'The AI Manager did not return a summary yet.';

export default function GlobalAICompanion() {
  const { activeCompany } = useCompany();
  const location = useLocation();
  const pageContext = getAIPageContext(location.pathname);
  const activeCompanyId = activeCompany?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const sendPrompt = async ({ intent = 'review', prompt }) => {
    const contextNote = formatAIPageContextForPrompt(pageContext);
    const basePrompt = intent === 'explain_page' ? `${prompt} ${contextNote}` : prompt;
    const trimmedPrompt = basePrompt.trim();
    if (!trimmedPrompt || isSending) {
      return;
    }

    setIsOpen(true);
    setIsSending(true);
    setError(null);
    setMessages((current) => [...current, { role: 'user', text: trimmedPrompt }]);

    try {
      const response = await aiAssistantAPI.askIntent({
        intent,
        prompt: trimmedPrompt,
        sessionId,
        companyId: activeCompanyId,
      });
      setSessionId(response?.sessionId || sessionId);
      setMessages((current) => [...current, { role: 'assistant', text: getAnswerText(response) }]);
    } catch (err) {
      setError(formatApiError(err, 'Unable to reach the AI Manager.').message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const prompt = draft;
    setDraft('');
    sendPrompt({ intent: 'custom', prompt });
  };

  return (
    <aside
      className="fixed bottom-6 right-6 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3"
      aria-label="AI Accounting Manager companion"
    >
      {isOpen ? (
        <section className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <div className="flex items-center gap-2">
                <AIBadge label="AI" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-50">
                  AI Accounting Manager
                </h2>
              </div>
              <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                Read-only, audited, company-scoped
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current page: {pageContext.label}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Manager"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="space-y-4 px-4 py-4">
            <div className="grid gap-2">
              {QUICK_PROMPTS.map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  disabled={isSending}
                  onClick={() => sendPrompt(item)}
                >
                  <SparklesIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Button>
              ))}
            </div>

            <div
              className="max-h-44 space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-950"
              aria-live="polite"
            >
              {messages.length ? (
                messages.slice(-4).map((message, index) => (
                  <div
                    key={`${message.role}-${index}-${message.text}`}
                    className={
                      message.role === 'assistant'
                        ? 'text-gray-800 dark:text-gray-100'
                        : 'font-medium text-gray-600 dark:text-gray-300'
                    }
                  >
                    <span className="sr-only">
                      {message.role === 'assistant' ? 'AI Manager response: ' : 'Your prompt: '}
                    </span>
                    {message.text}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Ask for a read-only briefing, risk summary, or explanation.
                </p>
              )}
              {isSending ? (
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  AI Manager is reviewing the available context...
                </p>
              ) : null}
              {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
            </div>

            <form className="flex gap-2" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="global-ai-companion-input">
                Ask AI Accounting Manager
              </label>
              <input
                id="global-ai-companion-input"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask a read-only question"
                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSending}
                disabled={!draft.trim()}
                aria-label="Send AI Manager prompt"
              >
                <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Send</span>
              </Button>
            </form>

            <Link to="/ai-manager" className="block">
              <Button variant="secondary" size="sm" className="w-full">
                Open full AI Manager
              </Button>
            </Link>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-2xl shadow-primary-600/30 transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-400"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label="Open AI Manager"
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden="true" />
      </button>
    </aside>
  );
}
