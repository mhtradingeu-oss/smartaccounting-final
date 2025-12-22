import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import Button from '../components/Button';
import BankStatementStatusBadge from '../components/BankStatementStatusBadge';
import { useCompany } from '../context/CompanyContext';
import { bankStatementsAPI } from '../services/bankStatementsAPI';
import { formatApiError } from '../services/api';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Uncategorized' },
  { value: 'SALES', label: 'Sales' },
  { value: 'EXPENSES', label: 'Expenses' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'BANK_FEES', label: 'Bank fees' },
  { value: 'OTHER', label: 'Other' },
];

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

const formatCurrency = (value, currency = 'EUR') => {
  if (value === undefined || value === null) {
    return '—';
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(value);
};

const BankStatementDetail = () => {
  const { activeCompany } = useCompany();
  const { statementId } = useParams();
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyIds, setBusyIds] = useState([]);
  const controllerRef = useRef(null);

  const statementSummary = location.state?.statement;

  const fetchTransactions = useCallback(
    async (signal) => {
      if (!activeCompany?.id || !statementId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await bankStatementsAPI.transactions(statementId, { signal });
        const items = payload?.data ?? payload ?? [];
        setTransactions(Array.isArray(items) ? items : []);
      } catch (fetchError) {
        if (fetchError?.code === 'ERR_CANCELED') {
          return;
        }
        setError(formatApiError(fetchError, 'Unable to load transactions.'));
      } finally {
        setLoading(false);
      }
    },
    [activeCompany?.id, statementId],
  );


  const refreshTransactions = useCallback(() => {
    if (!activeCompany?.id || !statementId) {
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    fetchTransactions(controller.signal);
  }, [activeCompany?.id, statementId, fetchTransactions]);

  useEffect(() => {
    if (!activeCompany?.id || !statementId) {
      setTransactions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    fetchTransactions(controller.signal);

    return () => {
      controller.abort();
    };
  }, [activeCompany?.id, statementId, fetchTransactions]);

  const setBusy = (transactionId) => {
    setBusyIds((prev) => (prev.includes(transactionId) ? prev : [...prev, transactionId]));
  };

  const clearBusy = (transactionId) => {
    setBusyIds((prev) => prev.filter((id) => id !== transactionId));
  };

  const handleToggleReconciled = async (transaction) => {
    setActionError(null);
    setBusy(transaction.id);

    try {
      const payload = { isReconciled: !transaction.isReconciled };
      const response = await bankStatementsAPI.updateTransaction(transaction.id, payload);
      const updated = response?.data ?? response;
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transaction.id ? updated : tx)),
      );
    } catch (updateError) {
      if (updateError?.code === 'ERR_CANCELED') {
        return;
      }
      setActionError(formatApiError(updateError, 'Unable to update reconciliation status.'));
    } finally {
      clearBusy(transaction.id);
    }
  };

  const handleCategoryChange = async (transaction, newCategory) => {
    if (newCategory === (transaction.category || '')) {
      return;
    }

    setActionError(null);
    setBusy(transaction.id);

    try {
      const payload = { category: newCategory };
      const response = await bankStatementsAPI.updateTransaction(transaction.id, payload);
      const updated = response?.data ?? response;
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transaction.id ? updated : tx)),
      );
    } catch (updateError) {
      if (updateError?.code === 'ERR_CANCELED') {
        return;
      }
      setActionError(formatApiError(updateError, 'Unable to save category.'));
    } finally {
      clearBusy(transaction.id);
    }
  };

  const busySet = useMemo(() => new Set(busyIds), [busyIds]);

  if (!activeCompany) {
    return (
      <EmptyState
        title="No company selected"
        description="Bank statement transactions are scoped to the active company. Choose one first."
        action={
          <Link to="/companies" className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
            Select company
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company</p>
          <h1 className="text-3xl font-bold text-gray-900">
            {statementSummary?.fileName || 'Bank statement detail'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-sm text-gray-500">
              {activeCompany.name} • ID {statementId}
            </span>
            <BankStatementStatusBadge status={statementSummary?.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/bank-statements">
            <Button variant="outline" size="medium">
              Back to list
            </Button>
          </Link>
          <Button variant="secondary" size="medium" onClick={refreshTransactions} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError.message}
        </div>
      )}
      <div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reconciled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-transparent">
            {transactions.map((transaction) => {
              const busy = busySet.has(transaction.id);
              return (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {formatDate(transaction.transactionDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {transaction.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={transaction.category || ''}
                      onChange={(event) => handleCategoryChange(transaction, event.target.value)}
                      disabled={busy}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          transaction.isReconciled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300'
                        }`}
                      >
                        {transaction.isReconciled ? 'Reconciled' : 'Pending'}
                      </span>
                      <Button
                        variant={transaction.isReconciled ? 'secondary' : 'success'}
                        size="small"
                        onClick={() => handleToggleReconciled(transaction)}
                        loading={busy}
                        disabled={busy}
                      >
                        {transaction.isReconciled ? 'Mark pending' : 'Reconcile'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

  );
};

export default BankStatementDetail;
