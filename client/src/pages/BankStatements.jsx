import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import BankStatementStatusBadge from '../components/BankStatementStatusBadge';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import PermissionGuard from '../components/PermissionGuard';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { bankStatementsAPI } from '../services/bankStatementsAPI';
import { formatApiError } from '../services/api';
import { can, isReadOnlyRole } from '../lib/permissions';
import {
  PageLoadingState,
  PageEmptyState,
  PageErrorState,
  PageNoAccessState,
} from '../components/ui/PageStates';

export default function BankStatements() {
  const { activeCompany, activeCompanyId } = useCompany();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const isReadOnlyUser = isReadOnlyRole(user?.role);
  const hasBankWriteAccess = can('bank:write', user?.role);

  const loadStatements = useCallback(
    async (signal) => {
      if (!activeCompanyId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await bankStatementsAPI.list({ signal });
        const items = payload?.data ?? payload ?? [];
        setStatements(Array.isArray(items) ? items : []);
      } catch (fetchError) {
        if (fetchError?.code === 'ERR_CANCELED') {
          return;
        }
        setError(formatApiError(fetchError, 'Unable to load bank statements.'));
      } finally {
        setLoading(false);
      }
    },
    [activeCompanyId],
  );

  const refreshStatements = useCallback(() => {
    if (!activeCompanyId) {
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    loadStatements(controller.signal);
  }, [activeCompanyId, loadStatements]);

  useEffect(() => {
    if (!activeCompanyId) {
      setStatements([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    loadStatements(controller.signal);

    return () => {
      controller.abort();
    };
  }, [activeCompanyId, loadStatements]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const BANK_STATEMENT_REFRESH_EVENT = 'BANK_STATEMENT_REFRESH_EVENT';
    const handleRefresh = () => {
      refreshStatements();
    };

    window.addEventListener(BANK_STATEMENT_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(BANK_STATEMENT_REFRESH_EVENT, handleRefresh);
    };
  }, [refreshStatements]);

  // --- Read-only summary calculations ---
  const summary = useMemo(() => {
    if (!statements || statements.length === 0) {
      return {
        totalStatements: 0,
        totalTransactions: 0,
        minDate: null,
        maxDate: null,
      };
    }
    let totalTransactions = 0;
    let minDate = null;
    let maxDate = null;
    for (const s of statements) {
      totalTransactions += Number(s.totalTransactions) || 0;
      const start = s.statementPeriodStart ? new Date(s.statementPeriodStart) : null;
      const end = s.statementPeriodEnd ? new Date(s.statementPeriodEnd) : null;
      if (start && (!minDate || start < minDate)) {
        minDate = start;
      }
      if (end && (!maxDate || end > maxDate)) {
        maxDate = end;
      }
    }
    return {
      totalStatements: statements.length,
      totalTransactions,
      minDate,
      maxDate,
    };
  }, [statements]);

  const statementCount = summary.totalStatements;
  const summaryTitle = isReadOnlyUser ? 'Read-only summary' : 'Statement summary';
  const summarySubtitle = isReadOnlyUser
    ? 'Totals reflect the statements currently available for viewing.'
    : 'Totals reflect the statements currently available to your team.';
  const summaryDetail = isReadOnlyUser
    ? 'Data updates automatically in read-only mode.'
    : 'Data refreshes after every successful import.';

  function formatDate(date) {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString('de-DE');
  }

  if (!activeCompany) {
    return <PageNoAccessState />;
  }

  // Contextual AI entry point
  if (!loading && !error) {
    // Only show when data is loaded
    return (
      <>
        <div className="flex justify-end mb-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 text-sm font-medium shadow-sm"
            title="Ask AI about bank statements"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('open-ai-assistant', { detail: { context: 'bank-statements' } }),
              )
            }
          >
            <span role="img" aria-label="AI">
              🤖
            </span>{' '}
            Ask AI
          </button>
        </div>
        <div className="mb-2 text-xs text-gray-500">
          <span className="font-semibold">What does AI see?</span> The assistant will only see your
          current company’s bank statements, transaction totals, and visible details on this page.
          No generic questions—AI answers are always based on the statements you see here.
        </div>
        {/* ...existing code... */}
      </>
    );
  }

  if (loading) {
    return <PageLoadingState />;
  }

  if (error) {
    return <PageErrorState onRetry={refreshStatements} />;
  }

  if (statementCount === 0) {
    // Custom empty state for Bank Statements
    const emptyTitle = t('No bank statements found');
    const emptyDescription = t(
      'This page displays all imported bank statements for your company. Bank statements are used to reconcile transactions, track cash flow, and support accounting compliance.',
    );
    let emptyHelp = '';
    let emptyAction = null;
    if (isReadOnlyUser) {
      emptyHelp = t(
        'You have read-only access. Importing or previewing bank statements is disabled for your role. If you need to import statements, please contact your administrator.',
      );
    } else if (hasBankWriteAccess) {
      emptyHelp = t(
        'To get started, import your first bank statement. You can also preview a statement to see how the process works.',
      );
      emptyAction = (
        <div className="flex flex-col gap-3 items-center">
          <Button
            variant="primary"
            size="medium"
            onClick={() => navigate('/bank-statements/import')}
          >
            {t('Import bank statement')}
          </Button>
          <Button
            variant="outline"
            size="medium"
            onClick={() => navigate('/bank-statements/preview')}
          >
            {t('Preview bank statement')}
          </Button>
        </div>
      );
    } else {
      emptyHelp = t(
        'You do not have permission to import or preview bank statements. If you believe this is an error, please contact your administrator.',
      );
    }
    return (
      <div className="pt-10">
        <PageEmptyState
          action={emptyAction}
          title={emptyTitle}
          description={emptyDescription}
          help={emptyHelp}
        />
      </div>
    );
  }

  // --- AI UI audit additions ---
  // AI entry point: visible but not intrusive
  const aiEnabled = user?.features?.includes('ai-bank-statements');
  const aiDisabledReason = !aiEnabled
    ? user?.features?.includes('ai-bank-statements') === false
      ? 'AI features are disabled by your administrator.'
      : 'AI features are not available for your role or company.'
    : null;

  return (
    <div className="space-y-6">
      {isReadOnlyUser && <ReadOnlyBanner message={t('states.read_only.bank_statements_notice')} />}
      {isReadOnlyUser && (
        <ReadOnlyBanner
          message={t('states.read_only.bank_statements_notice')}
          details="AI features are strictly read-only for safety and compliance. No actions, changes, or transactions can be executed by AI. All responses are for informational purposes only, and every interaction is logged for audit. AI is helpful, never authoritative or dangerous."
        />
      )}

      {/* AI entry point: visible but not intrusive */}
      <div className="flex justify-end mb-2">
        {aiEnabled ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ai"
              size="small"
              onClick={() => navigate('/bank-statements/ai-advisor')}
              title="Get AI-powered insights and reconciliation suggestions"
            >
              {(() => {
                const { AIBadge } = require('../components/AIBadge');
                return <AIBadge label="AI" className="mr-1" />;
              })()}
              AI Advisor
            </Button>
            <span className="text-xs text-blue-600 font-medium">AI-generated, advisory only</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ai" size="small" disabled title={aiDisabledReason}>
              {(() => {
                const { AIBadge } = require('../components/AIBadge');
                return <AIBadge label="AI" className="mr-1" />;
              })()}
              AI Advisor
            </Button>
            <span className="text-xs text-gray-400">{aiDisabledReason}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company</p>
          <h1 className="text-3xl font-bold text-gray-900">{activeCompany.name}</h1>
          <p className="text-sm text-gray-500">Bank statements overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PermissionGuard action="bank:write" role={user?.role}>
            <Button
              variant="secondary"
              size="medium"
              onClick={refreshStatements}
              disabled={loading}
            >
              Refresh
            </Button>
          </PermissionGuard>
          <div className="flex flex-col">
            <PermissionGuard action="bank:write" role={user?.role}>
              <Button
                variant="primary"
                size="medium"
                onClick={() => navigate('/bank-statements/import')}
              >
                Import bank statement
              </Button>
            </PermissionGuard>
            <span className="text-xs text-gray-500">
              Accountant/Admin only - writes to company data.
            </span>
          </div>
          <div className="flex flex-col">
            <Button
              variant="outline"
              size="medium"
              onClick={() => navigate('/bank-statements/preview')}
              disabled={isReadOnlyUser}
              title={
                isReadOnlyUser
                  ? 'Preview bank statement (no data will be saved) is disabled for read-only roles'
                  : undefined
              }
            >
              Preview bank statement (no data will be saved)
            </Button>
            <span className="text-xs text-gray-500">Preview only – nothing will be imported</span>
          </div>
        </div>
      </div>

      {/* AI explanation and trust indicators */}
      {aiEnabled && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-2">
          <h3 className="text-sm font-semibold text-blue-700 mb-1">About AI Advisor</h3>
          <ul className="text-xs text-blue-700 list-disc pl-4 space-y-1">
            <li>
              AI provides reconciliation suggestions and insights based on your imported statements.
            </li>
            <li>
              AI-generated advice is advisory only and should be reviewed by a qualified accountant.
            </li>
            <li>
              AI does <strong>not</strong> make changes to your data or import statements
              automatically.
            </li>
            <li>Some features may be disabled due to company policy, role, or feature flags.</li>
            <li>
              Trust indicators: Look for{' '}
              <span role="img" aria-label="AI">
                🤖
              </span>{' '}
              to identify AI-generated content.
            </li>
          </ul>
        </div>
      )}
      {!aiEnabled && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mb-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">AI Advisor unavailable</h3>
          <p className="text-xs text-gray-700">{aiDisabledReason}</p>
        </div>
      )}

      <section
        aria-label={summaryTitle}
        className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-5 mb-2 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {summaryTitle}
            </p>
            <p className="text-sm text-gray-500">{summarySubtitle}</p>
          </div>
          <p className="text-xs font-medium text-gray-500">{summaryDetail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
              Total statements
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {summary.totalStatements.toLocaleString('de-DE')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
              Total transactions
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {summary.totalTransactions.toLocaleString('de-DE')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
              Date range
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {summary.minDate ? formatDate(summary.minDate) : '—'} –{' '}
              {summary.maxDate ? formatDate(summary.maxDate) : '—'}
            </span>
            <span className="text-xs text-gray-500">
              {summary.minDate || summary.maxDate
                ? 'Earliest to latest statement period in view.'
                : 'No statement periods available yet.'}
            </span>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {statements.map((statement) => (
          <div
            key={statement.id}
            className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200 dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">
                  {formatDate(statement.statementPeriodStart)} &ndash;{' '}
                  {formatDate(statement.statementPeriodEnd)}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {statement.fileName || 'Bank statement'}
                </h2>
                <p className="text-sm text-gray-500">
                  {statement.totalTransactions ?? 0} transactions • processed{' '}
                  {statement.processedTransactions ?? 0}
                </p>
              </div>
              <BankStatementStatusBadge status={statement.status} />
              {statement.status !== 'draft' && (
                <span
                  className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold"
                  title="GoBD Immutability"
                >
                  Legally locked (GoBD)
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Imported{' '}
                {statement.importDate
                  ? new Date(statement.importDate).toLocaleString('de-DE')
                  : '—'}
              </div>
              <Link
                to={`/bank-statements/${statement.id}`}
                state={{ statement }}
                className="inline-flex"
              >
                <Button variant="outline" size="medium">
                  View transactions
                </Button>
              </Link>
              {hasBankWriteAccess && (
                <div className="flex flex-col gap-1 text-right text-xs text-gray-500">
                  {statement.status !== 'draft' ? (
                    <div className="flex flex-col items-end">
                      <span
                        className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold mb-1"
                        title="GoBD Immutability"
                      >
                        Legally locked (GoBD)
                      </span>
                      <span className="text-xs text-red-700 font-semibold">
                        This record is legally locked (GoBD). Edits and deletions are prohibited by
                        German accounting law.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="danger"
                        size="medium"
                        className="opacity-70 cursor-not-allowed"
                        disabled
                        title="Statement deletion is shipping in the next release."
                      >
                        Delete (coming soon)
                      </Button>
                      <Button
                        variant="secondary"
                        size="medium"
                        className="opacity-70 cursor-not-allowed"
                        disabled
                        title="Reprocessing statements is coming in a future release."
                      >
                        Reprocess (coming soon)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
