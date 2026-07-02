import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { PageNoAccessState } from '../components/ui/PageStates';
import { useCompany } from '../context/CompanyContext';
import { formatApiError } from '../services/api';
import { listDocumentInbox } from '../services/ocrAPI';

const FILTERS = [
  { key: 'all', label: 'All documents', params: {} },
  { key: 'needs_review', label: 'Needs review', params: { reviewStatus: 'needs_review' } },
  { key: 'rechecked', label: 'Rechecked', params: { reviewStatus: 'rechecked' } },
  { key: 'manual_override', label: 'Manual override', params: { manualOverride: 'true' } },
  {
    key: 'accountant_review',
    label: 'Accountant review',
    params: { accountantReviewRequired: 'true' },
  },
  { key: 'draft_created', label: 'Draft created', params: { draftCreated: 'true' } },
];

const STATUS_META = {
  needs_review: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  rechecked: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200',
  ready_for_review: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  draft_created: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  default: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
};

const normalizeText = (value) => String(value || '').replace(/_/g, ' ');

const formatDate = (value) => {
  if (!value) {return '—';}
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {return '—';}
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatBoolean = (value) => {
  if (value === true) {return 'Yes';}
  if (value === false) {return 'No';}
  return '—';
};

const statusClass = (status) => STATUS_META[status] || STATUS_META.default;

const StatusPill = ({ label, value }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(value)}`}
  >
    {label || normalizeText(value) || 'Unknown'}
  </span>
);

const DocumentInbox = () => {
  const { activeCompany } = useCompany();
  const activeCompanyId = activeCompany?.id ?? null;

  const [activeFilter, setActiveFilter] = useState('all');
  const [documents, setDocuments] = useState([]);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedFilter = useMemo(
    () => FILTERS.find((filter) => filter.key === activeFilter) || FILTERS[0],
    [activeFilter],
  );

  const loadDocuments = useCallback(async () => {
    if (!activeCompanyId) {return;}

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await listDocumentInbox({
        ...selectedFilter.params,
        limit: 100,
      });
      setDocuments(Array.isArray(response?.documents) ? response.documents : []);
      setCount(Number(response?.count) || 0);
      setStatus('success');
    } catch (error) {
      setDocuments([]);
      setCount(0);
      setErrorMessage(formatApiError(error, 'Unable to load document inbox.'));
      setStatus('error');
    }
  }, [activeCompanyId, selectedFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDocuments]);

  const stats = useMemo(() => {
    const draftCreated = documents.filter((doc) => !!doc.draftCreation?.draftId).length;
    const manualOverride = documents.filter((doc) => !!doc.manualOverride).length;
    const accountantReview = documents.filter((doc) => doc.accountantReviewRequired === true).length;
    const vatRestricted = documents.filter((doc) => doc.vatTreatment === 'no_vorsteuer_allowed').length;

    return [
      { label: 'Visible documents', value: count },
      { label: 'Drafts created', value: draftCreated },
      { label: 'Manual overrides', value: manualOverride },
      { label: 'VAT restricted', value: vatRestricted },
      { label: 'Accountant review', value: accountantReview },
    ];
  }, [count, documents]);

  if (!activeCompanyId) {
    return <PageNoAccessState />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
                <DocumentTextIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-primary-600 dark:text-primary-300">
                  AI document workflow
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Document Inbox
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Review AI-assisted document intake results, VAT restrictions, manual overrides,
              and draft creation status before accounting follow-up.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={loadDocuments}
              disabled={status === 'loading'}
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Link to="/ai-assistant">
              <Button type="button" variant="primary">
                Open AI Assistant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <FunnelIcon className="h-5 w-5" />
          Filters
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-950/40 dark:text-primary-200'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {status === 'loading' ? (
        <section className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </section>
      ) : null}

      {status === 'error' ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="font-semibold">Document inbox unavailable</h2>
              <p className="mt-1 text-sm">{errorMessage}</p>
            </div>
          </div>
        </section>
      ) : null}

      {status === 'success' && documents.length === 0 ? (
        <EmptyState
          title="No documents found"
          description="Upload and analyze a document in the AI Assistant to populate the document inbox."
          action={
            <Link to="/ai-assistant">
              <Button type="button" variant="primary">Open AI Assistant</Button>
            </Link>
          }
        />
      ) : null}

      {status === 'success' && documents.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Accounting decision</th>
                  <th className="px-4 py-3">VAT / Risk</th>
                  <th className="px-4 py-3">Draft</th>
                  <th className="px-4 py-3">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {documents.map((document) => {
                  const reviewStatus = document.reviewState?.status || document.processingStatus;
                  const decision = document.accountingDecision || {};
                  const draftCreated = !!document.draftCreation?.draftId;
                  return (
                    <tr key={document.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {document.originalName || document.fileName || 'Untitled document'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {normalizeText(document.documentType || 'unknown')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill value={reviewStatus} />
                        <p className="mt-2 text-xs text-gray-500">
                          Eligible: {formatBoolean(document.draftEligibility?.eligible)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {normalizeText(decision.postingIntent || 'No decision')}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Draft type: {normalizeText(decision.draftType || '—')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          {normalizeText(document.vatTreatment || decision.vatTreatment || '—')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {document.manualOverride ? (
                            <StatusPill label="Manual override" value="needs_review" />
                          ) : null}
                          {document.accountantReviewRequired ? (
                            <StatusPill label="Accountant review" value="rechecked" />
                          ) : null}
                          {document.inputVatAllowed === false ? (
                            <StatusPill label="No input VAT" value="needs_review" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {draftCreated ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircleIcon className="h-4 w-4" />
                            Created
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Not created</span>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {document.draftCreation?.draftType || ''}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(document.uploadedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="font-semibold">Human review remains required</h2>
            <p className="mt-1 text-sm">
              This inbox is read-only. It shows AI-assisted intake decisions and draft status,
              but it does not post, approve, delete, reconcile, or submit accounting records.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DocumentInbox;
