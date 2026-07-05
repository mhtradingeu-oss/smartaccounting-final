import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { reviewCenterAPI } from '../services/reviewCenterAPI';
import { formatApiError } from '../services/api';
import Card from '../components/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { PageErrorState } from '../components/ui/PageStates';

const scoreTone = (score) => {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
};

const priorityTone = (priority = '') => {
  if (priority === 'high') return 'bg-red-50 text-red-700 border-red-200';
  if (priority === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const formatLabel = (value = '') =>
  value
    .toString()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s-]/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');

const ScoreCard = ({ label, value }) => (
  <div className={`rounded-2xl border p-4 ${scoreTone(Number(value) || 0)}`}>
    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
    <p className="mt-2 text-3xl font-bold">{Number(value) || 0}%</p>
  </div>
);

const LoadingState = () => (
  <div className="space-y-6" aria-label="Loading Smart Review Center">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
    <Skeleton className="h-48 w-full" />
  </div>
);

export default function SmartReviewCenter() {
  const { activeCompany } = useCompany();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    if (!activeCompany?.id) {
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await reviewCenterAPI.getSummary({ companyId: activeCompany.id });
      setSummary(result || null);
    } catch (err) {
      setSummary(null);
      setError(formatApiError(err, 'Unable to load Smart Review Center.'));
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const readinessEntries = useMemo(() => {
    const readiness = summary?.readiness || {};
    return [
      ['Overall', readiness.overall],
      ['DATEV', readiness.datev],
      ['Tax', readiness.tax],
      ['Audit', readiness.audit],
      ['Bank', readiness.bank],
      ['Documents', readiness.documents],
      ['AI', readiness.ai],
    ];
  }, [summary]);

  if (!activeCompany?.id) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Smart Review</p>
          <h1 className="text-3xl font-bold text-gray-900">Smart Review Center</h1>
        </div>
        <Card className="p-6">
          <p className="font-semibold text-gray-900">Select a company to view review readiness.</p>
          <p className="mt-2 text-sm text-gray-600">
            The Smart Review Center is company-scoped and only reads accounting, tax, bank, and AI signals.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Unable to load Smart Review Center"
        description={error}
        actionLabel="Retry"
        onAction={loadSummary}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Smart Review</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Smart Review Center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              A read-only accounting command center for DATEV readiness, Steuerberater preparation,
              missing evidence, bank review, AI signals, and safe next actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/tax-bridge">
              <Button variant="secondary" size="sm">Open Tax Bridge</Button>
            </Link>
            <Link to="/ai-manager">
              <Button variant="secondary" size="sm">Open AI Manager</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {readinessEntries.map(([label, value]) => (
          <ScoreCard key={label} label={label} value={value} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">What needs attention today</h2>
              <p className="mt-1 text-sm text-gray-600">
                Review-only next actions generated from accounting, tax, bank, and AI readiness signals.
              </p>
            </div>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {summary?.mode || 'read_only_preparation'}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {(summary?.nextActions || []).map((action) => (
              <div key={action.code || action.title} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityTone(action.priority)}`}>
                        {formatLabel(action.priority)}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">{action.code}</span>
                    </div>
                    <h3 className="mt-2 font-semibold text-gray-900">{action.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{action.description}</p>
                  </div>
                  {action.target && (
                    <Link className="text-sm font-semibold text-indigo-700 hover:text-indigo-900" to={action.target}>
                      Open
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900">Counts</h2>
          <p className="mt-1 text-sm text-gray-600">Live review signals for {activeCompany.name}.</p>
          <dl className="mt-5 space-y-3">
            {Object.entries(summary?.counts || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <dt className="text-sm text-gray-600">{formatLabel(key)}</dt>
                <dd className="text-sm font-bold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900">Warnings checklist</h2>
          <p className="mt-1 text-sm text-gray-600">
            These warnings should be reviewed before export, filing preparation, or Steuerberater handover.
          </p>
          <div className="mt-5 space-y-3">
            {(summary?.warnings || []).length ? (
              summary.warnings.map((warning) => (
                <div key={`${warning.source}-${warning.code}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {formatLabel(warning.severity)}
                    </span>
                    <span className="text-xs font-semibold text-amber-800">{warning.code}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-amber-950">{warning.message}</h3>
                  <p className="mt-1 text-sm text-amber-900">{warning.action}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                No warnings were returned by the review summary.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900">Safety boundaries</h2>
          <p className="mt-1 text-sm text-gray-600">
            This page is intentionally read-only and designed for German accounting preparation workflows.
          </p>
          <ul className="mt-5 space-y-3">
            {(summary?.sourceBoundaries || []).map((boundary) => (
              <li key={boundary} className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm font-semibold text-gray-700">
                {boundary}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-bold text-indigo-950">Sources</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(summary?.sources || {}).map(([key, value]) => (
                <span key={key} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">
                  {formatLabel(key)}: {String(value)}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
