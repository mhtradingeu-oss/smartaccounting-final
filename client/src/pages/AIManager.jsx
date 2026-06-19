import { Link } from 'react-router-dom';
import { ChatBubbleLeftRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AIBadge } from '../components/AIBadge';
import AIInsightCard from '../components/AIInsightCard';
import AISeverityPill from '../components/AISeverityPill';
import AITrustBanner from '../components/AITrustBanner';
import { Button } from '../components/ui/Button';

const ExplainWhy = ({ why }) => <p className="text-sm text-gray-600">{why}</p>;

const reviewItems = [
  'Open invoices that may need follow-up',
  'Unreconciled bank transactions',
  'Recent AI insights awaiting human review',
];

export default function AIManager() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <AIBadge label="AI Manager" />
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Read-only advisory workspace
          </span>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Accounting Manager</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              A company-scoped briefing surface for reviewing accounting context, risks, and
              explanations without changing records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            'Assistant prompts use the existing audited AI assistant endpoint.',
            'Accounting staff remain responsible for review and decisions.',
          ]}
          policyUrl={null}
        />
      </header>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="AI Manager briefing summary">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-gray-900">Today’s Accounting Briefing</h2>
          </div>
          <p className="text-sm text-gray-600">
            Review the latest company-scoped accounting signals from AI Insights and the assistant
            context. Phase 1 keeps this briefing advisory and read-only.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {['Invoices', 'Expenses', 'Bank activity'].map((label) => (
              <div key={label} className="rounded border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Context
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Critical Alerts</h2>
            <AISeverityPill severity="high" />
          </div>
          <p className="text-sm text-gray-600">
            High-severity AI insights will surface here when the existing insights feed reports
            material review needs.
          </p>
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AIInsightCard
          type="Next Best Actions"
          summary="Start with the highest-severity risks, then review overdue receivables and unreconciled transactions."
          confidence="medium"
          severity="medium"
          dataSource="AI insights, invoices, bank transactions"
          lastEvaluated="Current assistant context"
          why="These are advisory review suggestions only. No workflow or record changes are available from this page."
          ExplainWhy={ExplainWhy}
        />

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Review Queue</h2>
            <AIBadge label="Review" />
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            {reviewItems.map((item) => (
              <li key={item} className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Ask AI Manager</h2>
        <p className="mt-2 text-sm text-gray-600">
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
