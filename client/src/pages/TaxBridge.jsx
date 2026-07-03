import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
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
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      const data = await getTaxBridgeReadiness({ companyId: activeCompanyId });
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
          { companyId: activeCompanyId },
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
  }, [activeCompanyId]);

  const metrics = readiness?.metrics || {};
  const issues = readiness?.issues || [];
  const warnings = readiness?.warnings || [];
  const nextActions = readiness?.nextActions || [];
  const sourceBoundaries = readiness?.sourceBoundaries || [];

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
                  to="/datev-export"
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
