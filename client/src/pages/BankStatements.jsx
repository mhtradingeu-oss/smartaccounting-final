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

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const BANK_STATEMENT_REFRESH_EVENT = 'bankStatements:refresh';

const BankStatements = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const activeCompanyId = activeCompany?.id;
  const navigate = useNavigate();
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

  if (!activeCompany) {
    return <PageNoAccessState />;
  }

  return (
    <div className="space-y-6">
      {isReadOnlyUser && (
        <ReadOnlyBanner message={t('states.read_only.bank_statements_notice')} />
      )}
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
            <span className="text-xs text-gray-500">
              Preview only – nothing will be imported
            </span>
          </div>
        </div>
      </div>

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

      {loading ? (
        <PageLoadingState />
      ) : error ? (
        <PageErrorState onRetry={refreshStatements} />
      ) : statementCount === 0 ? (
        <PageEmptyState />
      ) : (
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
                    <span>Per-statement delete & reprocess are planned for Q3.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankStatements;
