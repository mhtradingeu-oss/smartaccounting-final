import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import BankStatementStatusBadge from '../components/BankStatementStatusBadge';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import PermissionGuard from '../components/PermissionGuard';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole } from '../lib/permissions';
import { bankStatementsAPI } from '../services/bankStatementsAPI';
import { formatApiError } from '../services/api';

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

const BankStatements = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const activeCompanyId = activeCompany?.id;

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

  const statementCount = useMemo(() => statements.length, [statements]);

  if (!activeCompany) {
    return (
      <EmptyState
        title="Select a company first"
        description="Bank statements are scoped per company. Choose an active company to continue."
        action={
          <Link
            to="/companies"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            Select company
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {isReadOnlyRole(user?.role) && <ReadOnlyBanner />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company</p>
          <h1 className="text-3xl font-bold text-gray-900">{activeCompany.name}</h1>
          <p className="text-sm text-gray-500">Bank statements overview</p>
        </div>
        <div className="flex gap-2">
          <PermissionGuard action="bank:write" role={user?.role} showDisabled>
            <Button
              variant="secondary"
              size="medium"
              onClick={refreshStatements}
              disabled={loading}
            >
              Refresh
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-center text-sm font-semibold text-red-600">{error.message}</p>
          {error.retryable && (
            <Button onClick={refreshStatements} variant="primary">
              Retry
            </Button>
          )}
        </div>
      ) : statementCount === 0 ? (
        <EmptyState
          title="No bank statements"
          description="Upload your first bank statement"
          action={
            <Link to="/bank-statements/upload">
              <Button variant="primary">Upload Statement</Button>
            </Link>
          }
        />
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
                <PermissionGuard action="bank:write" role={user?.role} showDisabled>
                  <Button
                    variant="danger"
                    size="medium"
                    onClick={() => {
                      /* delete logic here */
                    }}
                  >
                    Delete
                  </Button>
                </PermissionGuard>
                <PermissionGuard action="bank:write" role={user?.role} showDisabled>
                  <Button
                    variant="secondary"
                    size="medium"
                    onClick={() => {
                      /* reprocess logic here */
                    }}
                  >
                    Reprocess
                  </Button>
                </PermissionGuard>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankStatements;
