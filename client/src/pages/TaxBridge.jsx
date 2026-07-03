import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { getTaxBridgeReadiness } from '../services/taxBridgeAPI';
import { formatApiError } from '../services/api';

const SCORE_LABELS = {
  overall: 'Overall readiness',
  datevReadiness: 'DATEV preparation',
  elsterPreparationReadiness: 'ELSTER preparation',
  gobdEvidenceReadiness: 'GoBD evidence',
};

const scoreTone = (score) => {
  if (score >= 85) {
    return 'text-green-700 bg-green-50 border-green-200';
  }
  if (score >= 70) {
    return 'text-amber-700 bg-amber-50 border-amber-200';
  }
  return 'text-red-700 bg-red-50 border-red-200';
};

const issueTone = (severity) => {
  if (severity === 'critical') {
    return 'border-red-200 bg-red-50 text-red-900';
  }
  return 'border-amber-200 bg-amber-50 text-amber-900';
};

const formatMetricLabel = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase());

const formatPeriodValue = (value) => {
  if (!value) {
    return 'All available data';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const defaultPeriod = () => {
  const now = new Date();
  return {
    from: `${now.getFullYear()}-01-01`,
    to: todayIsoDate(),
  };
};

const downloadJsonFile = (filename, payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const buildPackageSummary = (readiness, period) => {
  if (!readiness) {
    return '';
  }

  const scores = readiness.scores || {};
  const metrics = readiness.metrics || {};
  const issues = readiness.issues || [];
  const warnings = readiness.warnings || [];
  const boundaries = readiness.sourceBoundaries || [];

  return [
    'SmartAccounting Tax Bridge - Steuerberater Package Summary',
    `Period: ${period.from || 'all'} to ${period.to || 'all'}`,
    `Mode: ${readiness.mode}`,
    '',
    'Scores',
    `- Overall readiness: ${scores.overall ?? 0}/100`,
    `- DATEV preparation: ${scores.datevReadiness ?? 0}/100`,
    `- ELSTER preparation: ${scores.elsterPreparationReadiness ?? 0}/100`,
    `- GoBD evidence: ${scores.gobdEvidenceReadiness ?? 0}/100`,
    '',
    'Key Metrics',
    `- Invoices: ${metrics.totalInvoices ?? 0}`,
    `- Finalized invoices: ${metrics.finalizedInvoices ?? 0}`,
    `- Expenses: ${metrics.totalExpenses ?? 0}`,
    `- Posted journal entries: ${metrics.postedJournalEntries ?? 0}`,
    `- VAT accounts: ${metrics.taxAccounts ?? 0}`,
    `- Invoice attachments: ${metrics.invoiceAttachments ?? 0}`,
    `- Expense attachments: ${metrics.expenseAttachments ?? 0}`,
    '',
    `Critical issues: ${issues.length}`,
    ...issues.map((item) => `- ${item.code}: ${item.message}`),
    '',
    `Warnings: ${warnings.length}`,
    ...warnings.map((item) => `- ${item.code}: ${item.message}`),
    '',
    'Boundaries',
    ...boundaries.map((item) => `- ${item}`),
  ].join('\n');
};

function ScoreCard({ label, score }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${scoreTone(score)}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-bold">{score}</span>
        <span className="pb-1 text-sm font-semibold">/ 100</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/70">
        <div
          className="h-2 rounded-full bg-current"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function IssueList({ title, items, emptyText }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
        {title}
      </h2>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.code} className={`rounded-xl border p-4 ${issueTone(item.severity)}`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold">{item.code}</p>
                  <p className="mt-1 text-sm">{item.message}</p>
                </div>
                <span className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase">
                  {item.severity}
                </span>
              </div>
              {item.action && <p className="mt-3 text-sm font-medium">Next: {item.action}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function TaxBridge() {
  const { activeCompany } = useCompany();
  const initialPeriod = useMemo(() => defaultPeriod(), []);
  const [period, setPeriod] = useState(initialPeriod);
  const [draftPeriod, setDraftPeriod] = useState(initialPeriod);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [error, setError] = useState('');

  const activeCompanyId = activeCompany?.id || null;

  const loadReadiness = async ({ force = false } = {}) => {
    if (!activeCompanyId) {
      setReadiness(null);
      setLoading(false);
      return;
    }

    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const data = await getTaxBridgeReadiness({
        companyId: activeCompanyId,
        from: period.from,
        to: period.to,
      });
      setReadiness(data);
    } catch (err) {
      setError(formatApiError(err, 'Failed to load Tax Bridge readiness.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      if (!activeCompanyId) {
        setLoading(false);
        setReadiness(null);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await getTaxBridgeReadiness(
          {
            companyId: activeCompanyId,
            from: period.from,
            to: period.to,
          },
          { signal: controller.signal },
        );
        setReadiness(data);
      } catch (err) {
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          setError(formatApiError(err, 'Failed to load Tax Bridge readiness.'));
        }
      } finally {
        setLoading(false);
      }
    }

    run();

    return () => controller.abort();
  }, [activeCompanyId, period.from, period.to]);

  const metrics = useMemo(() => readiness?.metrics || {}, [readiness?.metrics]);
  const issues = useMemo(() => readiness?.issues || [], [readiness?.issues]);
  const warnings = useMemo(() => readiness?.warnings || [], [readiness?.warnings]);
  const nextActions = readiness?.nextActions || [];
  const sourceBoundaries = readiness?.sourceBoundaries || [];

  const packageChecklist = useMemo(
    () => [
      {
        id: 'readiness-json',
        label: 'Readiness JSON report',
        status: readiness ? 'ready' : 'missing',
        detail: 'Downloadable preparation-only readiness snapshot.',
      },
      {
        id: 'datev-export',
        label: 'DATEV-compatible export',
        status: (metrics.finalizedInvoices || 0) > 0 ? 'ready' : 'review',
        detail: 'Prepare from the DATEV export screen. No direct DATEV upload is performed.',
      },
      {
        id: 'vat-summary',
        label: 'VAT summary / UStVA preparation data',
        status:
          (metrics.taxAccounts || 0) >= 2 && (metrics.postedJournalEntries || 0) > 0
            ? 'ready'
            : 'review',
        detail: 'Review VAT summary data before Steuerberater or filing workflow.',
      },
      {
        id: 'attachments',
        label: 'Source document evidence',
        status:
          (metrics.invoiceAttachments || 0) + (metrics.expenseAttachments || 0) > 0
            ? 'ready'
            : 'review',
        detail: 'Receipts and invoice source documents improve GoBD evidence readiness.',
      },
      {
        id: 'warnings',
        label: 'Warnings checklist',
        status: warnings.length === 0 && issues.length === 0 ? 'ready' : 'review',
        detail: 'Resolve or document warnings before sending the package for review.',
      },
    ],
    [metrics, readiness, warnings.length, issues.length],
  );

  const handlePeriodChange = (field, value) => {
    setDraftPeriod((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleApplyPeriod = () => {
    setPeriod(draftPeriod);
  };

  const handleDownloadReadiness = () => {
    if (!readiness) {
      return;
    }

    downloadJsonFile(`tax-bridge-readiness-${period.from || 'all'}-${period.to || 'all'}.json`, {
      generatedAt: new Date().toISOString(),
      packageType: 'steuerberater_preparation_package',
      product: readiness.product,
      mode: readiness.mode,
      period,
      readiness,
      boundaries: readiness.sourceBoundaries,
    });
  };

  const handleCopyPackageSummary = async () => {
    if (!readiness || !navigator?.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(buildPackageSummary(readiness, period));
    setCopyStatus('Package summary copied.');
    window.setTimeout(() => setCopyStatus(''), 2500);
  };


  const scoreEntries = useMemo(() => {
    const currentScores = readiness?.scores || {};

    return Object.entries(SCORE_LABELS).map(([key, label]) => ({
      key,
      label,
      score: Number.isFinite(currentScores[key]) ? currentScores[key] : 0,
    }));
  }, [readiness?.scores]);

  if (!activeCompanyId) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-2xl font-bold">Tax Bridge</h1>
          <p className="mt-2 text-sm">Select a company to view tax readiness.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">
              SmartAccounting Tax Bridge
            </p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              Prepare. Review. Export safely with your Steuerberater.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-200">
              A read-only readiness cockpit for DATEV-compatible export preparation, ELSTER
              preparation checks, and GoBD evidence visibility. SmartAccounting does not submit tax
              filings or upload directly to DATEV.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadReadiness({ force: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh readiness
          </button>
        </div>
      </header>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-medium text-gray-700">Loading Tax Bridge readiness...</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="font-semibold">Could not load Tax Bridge readiness</h2>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
              Package Builder
            </p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Prepare Steuerberater package
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Build a preparation package for review. No DATEV upload. No ELSTER submission. No
              tax filing. It helps organize readiness, evidence, and next actions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadReadiness}
              disabled={!readiness}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download readiness JSON
            </button>
            <button
              type="button"
              onClick={handleCopyPackageSummary}
              disabled={!readiness}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ClipboardDocumentCheckIcon className="h-5 w-5" />
              Copy package summary
            </button>
          </div>
        </div>

        {copyStatus && (
          <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            {copyStatus}
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">From</span>
            <input
              type="date"
              value={draftPeriod.from}
              onChange={(event) => handlePeriodChange('from', event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">To</span>
            <input
              type="date"
              value={draftPeriod.to}
              onChange={(event) => handlePeriodChange('to', event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={handleApplyPeriod}
            disabled={loading || refreshing}
            className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            Apply period
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {packageChecklist.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-900">{item.label}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${
                    item.status === 'ready'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>


      {!loading && readiness && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {scoreEntries.map((entry) => (
              <ScoreCard key={entry.key} label={entry.label} score={entry.score} />
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                Readiness metrics
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(metrics).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {formatMetricLabel(key)}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-950 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <CheckCircleIcon className="h-5 w-5" />
                Period
              </h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold">From</dt>
                  <dd>{formatPeriodValue(readiness.period?.from)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">To</dt>
                  <dd>{formatPeriodValue(readiness.period?.to)}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Mode</dt>
                  <dd className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase">
                    {readiness.mode}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <IssueList
              title="Critical issues"
              items={issues}
              emptyText="No critical readiness blockers detected."
            />
            <IssueList
              title="Warnings"
              items={warnings}
              emptyText="No warnings detected for the current readiness view."
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Recommended next actions</h2>
              {nextActions.length ? (
                <ol className="mt-4 space-y-3">
                  {nextActions.map((action) => (
                    <li key={action} className="flex gap-3 text-sm text-gray-700">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      {action}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-gray-600">
                  No immediate action required. Keep documentation and postings reviewed.
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/exports/datev"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Open DATEV export
                </Link>
                <Link
                  to="/reports"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  Open reports
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-900 shadow-sm">
              <h2 className="text-lg font-semibold">Source boundaries</h2>
              <ul className="mt-4 space-y-3">
                {sourceBoundaries.map((boundary) => (
                  <li key={boundary} className="flex gap-3 text-sm">
                    <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
                    {boundary}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
                This page is a preparation cockpit. It is not legal advice, tax certification,
                official DATEV certification, or ELSTER submission.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
