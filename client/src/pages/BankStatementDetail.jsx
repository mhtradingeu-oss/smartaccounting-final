import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import Button from '../components/Button';
import BankStatementStatusBadge from '../components/BankStatementStatusBadge';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import PermissionGuard from '../components/PermissionGuard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { useCompany } from '../context/CompanyContext';
import { bankStatementsAPI } from '../services/bankStatementsAPI';
import { expensesAPI } from '../services/expensesAPI';
import { invoicesAPI } from '../services/invoicesAPI';
import { formatApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isReadOnlyRole } from '../lib/permissions';

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

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAuditActorName = (log) => {
  const actor = log?.user;
  if (!actor) {
    return 'System';
  }
  const firstName = actor.firstName?.trim() || '';
  const lastName = actor.lastName?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }
  if (actor.email) {
    return actor.email;
  }
  return 'System';
};

const getAuditTargetLabel = (log) => {
  const metadata = log?.newValues?.metadata || log?.oldValues?.metadata;
  if (!metadata) {
    return 'Bank transaction';
  }
  const targetParts = [];
  if (metadata.targetType) {
    const label = metadata.targetType.charAt(0).toUpperCase() + metadata.targetType.slice(1);
    targetParts.push(label);
  }
  if (metadata.targetId) {
    targetParts.push(`#${metadata.targetId}`);
  } else if (metadata.ledgerTransactionId) {
    targetParts.push(`Ledger ${metadata.ledgerTransactionId}`);
  } else if (metadata.bankTransactionId) {
    targetParts.push(`Bank ${metadata.bankTransactionId}`);
  }
  if (!targetParts.length) {
    return 'Bank transaction';
  }
  return targetParts.join(' ');
};

const auditActionLabels = {
  bank_transaction_reconciled: 'Manual reconciliation confirmed',
  bank_transaction_reconciliation_undone: 'Manual reconciliation undone',
};

const getAuditActionLabel = (action) => auditActionLabels[action] ?? action ?? 'Audit event';

const READ_ONLY_DETAIL_MESSAGE =
  'Bank statement details are available in read-only mode. No changes can be made.';

const STATUS_EXPLANATIONS = {
  PROCESSING:
    'This statement is being ingested and validated. Transactions will become available once processing completes.',
  COMPLETED: 'Processing has finished and the statement is available for read-only review.',
  FAILED: 'Processing could not finish, so the captured transactions are not available in this view.',
};

const TARGET_TABS = [
  { id: 'invoices', label: 'Invoices' },
  { id: 'expenses', label: 'Expenses' },
];

const BankStatementDetail = () => {
  const { activeCompany } = useCompany();
  const { statementId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyIds, setBusyIds] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [activeTargetTab, setActiveTargetTab] = useState('invoices');
  const [invoiceTargets, setInvoiceTargets] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [expenseTargets, setExpenseTargets] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState(null);
  const [manualConfirmChecked, setManualConfirmChecked] = useState(false);
  const [manualReason, setManualReason] = useState('');
  const [manualError, setManualError] = useState(null);
  const [isReconcilingManually, setIsReconcilingManually] = useState(false);
  const [manualSuccessMessage, setManualSuccessMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const auditControllerRef = useRef(null);
  const [selectedUndoTransaction, setSelectedUndoTransaction] = useState(null);
  const [undoReason, setUndoReason] = useState('');
  const [undoError, setUndoError] = useState(null);
  const [undoSuccessMessage, setUndoSuccessMessage] = useState('');
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoConfirmChecked, setUndoConfirmChecked] = useState(false);
  const controllerRef = useRef(null);

  const statementSummary = location.state?.statement;
  const isReadOnlySession = isReadOnlyRole(user?.role);

  const statusExplanation = useMemo(() => {
    const statusCode = (statementSummary?.status || '').toUpperCase();
    return STATUS_EXPLANATIONS[statusCode] || '';
  }, [statementSummary?.status]);

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

  const fetchAuditLogs = useCallback(
    async (signal) => {
      if (!activeCompany?.id || !statementId) {
        return;
      }

      setAuditLoading(true);
      setAuditError(null);

      try {
        const payload = await bankStatementsAPI.auditLogs(statementId, { signal });
        const items = payload?.data ?? payload ?? [];
        setAuditLogs(Array.isArray(items) ? items : []);
      } catch (fetchError) {
        if (fetchError?.code === 'ERR_CANCELED') {
          return;
        }
        setAuditError(formatApiError(fetchError, 'Unable to load audit log.'));
      } finally {
        setAuditLoading(false);
      }
    },
    [activeCompany?.id, statementId],
  );

  const refreshAuditLogs = useCallback(() => {
    if (!activeCompany?.id || !statementId) {
      return;
    }

    if (auditControllerRef.current) {
      auditControllerRef.current.abort();
    }

    const controller = new AbortController();
    auditControllerRef.current = controller;
    fetchAuditLogs(controller.signal);
  }, [activeCompany?.id, statementId, fetchAuditLogs]);

  useEffect(() => {
    if (!activeCompany?.id || !statementId) {
      setAuditLogs([]);
      setAuditError(null);
      setAuditLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    auditControllerRef.current = controller;
    fetchAuditLogs(controller.signal);

    return () => {
      controller.abort();
    };
  }, [activeCompany?.id, statementId, fetchAuditLogs]);

  const refreshStatementView = useCallback(() => {
    refreshTransactions();
    refreshAuditLogs();
  }, [refreshTransactions, refreshAuditLogs]);

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

  const handleManualConfirm = async () => {
    if (!selectedTransaction || !selectedTarget) {
      return;
    }

    setManualError(null);
    setIsReconcilingManually(true);

    try {
      const payload = {
        targetType: selectedTarget.type === 'invoices' ? 'invoice' : 'expense',
        targetId: selectedTarget.item?.id,
      };
      const trimmedReason = manualReason.trim();
      if (trimmedReason) {
        payload.reason = trimmedReason;
      }

      const response = await bankStatementsAPI.reconcileTransaction(selectedTransaction.id, payload);
      const updated = response?.data ?? response;

      setTransactions((prev) =>
        prev.map((tx) => (tx.id === selectedTransaction.id ? updated : tx)),
      );

      const targetLabel = getTargetLabel(selectedTarget.type, selectedTarget.item);
      const targetTypeLabel = selectedTarget.type === 'invoices' ? 'Invoice' : 'Expense';
      setManualSuccessMessage(`Transaction reconciled with ${targetTypeLabel} ${targetLabel}.`);

      closeManualReconciliation();
      refreshStatementView();
    } catch (confirmError) {
      if (confirmError?.code === 'ERR_CANCELED') {
        return;
      }
      setManualError(formatApiError(confirmError, 'Unable to confirm reconciliation.'));
    } finally {
      setIsReconcilingManually(false);
    }
  };

  const openUndoModal = (transaction) => {
    setSelectedUndoTransaction(transaction);
    setUndoReason('');
    setUndoError(null);
    setUndoConfirmChecked(false);
    setUndoSuccessMessage('');
  };

  const closeUndoModal = () => {
    setSelectedUndoTransaction(null);
    setUndoReason('');
    setUndoError(null);
    setUndoConfirmChecked(false);
  };

  const handleUndoReconciliation = async () => {
    if (!selectedUndoTransaction) {
      return;
    }

    const trimmedReason = undoReason.trim();
    if (!trimmedReason) {
      setUndoError({
        message: 'Please provide a reason for undoing the reconciliation.',
      });
      return;
    }

    setUndoError(null);
    setIsUndoing(true);

    try {
      const response = await bankStatementsAPI.undoReconciliation(selectedUndoTransaction.id, {
        reason: trimmedReason,
      });
      const updated = response?.data ?? response;
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === selectedUndoTransaction.id ? updated : tx)),
      );
      setUndoSuccessMessage('Reconciliation has been undone and logged for auditing.');
      refreshStatementView();
      closeUndoModal();
    } catch (undoErrorResponse) {
      if (undoErrorResponse?.code === 'ERR_CANCELED') {
        return;
      }
      setUndoError(formatApiError(undoErrorResponse, 'Unable to undo reconciliation.'));
    } finally {
      setIsUndoing(false);
    }
  };

  const reconciliationLogsByTransaction = useMemo(() => {
    const map = {};
    auditLogs.forEach((log) => {
      const resourceId = log?.resourceId;
      if (!resourceId) {
        return;
      }
      const key = String(resourceId);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(log);
    });
    return map;
  }, [auditLogs]);

  const getLatestReconciliationLog = (transactionId) => {
    const entries = reconciliationLogsByTransaction[String(transactionId)];
    if (!entries || entries.length === 0) {
      return null;
    }
    return entries.find((log) => log.action === 'bank_transaction_reconciled') ?? entries[0];
  };

  const busySet = useMemo(() => new Set(busyIds), [busyIds]);
  const showManualReconciliation = Boolean(selectedTransaction);

  useEffect(() => {
    if (!showManualReconciliation || !activeCompany?.id) {
      return undefined;
    }

    let canceled = false;
    setInvoiceTargets([]);
    setExpenseTargets([]);
    setInvoiceError(null);
    setExpenseError(null);
    setActiveTargetTab('invoices');
    setSelectedTarget(null);

    const loadInvoices = async () => {
      setInvoiceLoading(true);
      try {
        const data = await invoicesAPI.list({ companyId: activeCompany.id });
        if (!canceled) {
          setInvoiceTargets(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (!canceled) {
          setInvoiceError(fetchError);
          setInvoiceTargets([]);
        }
      } finally {
        if (!canceled) {
          setInvoiceLoading(false);
        }
      }
    };

    const loadExpenses = async () => {
      setExpenseLoading(true);
      try {
        const data = await expensesAPI.list({ companyId: activeCompany.id });
        if (!canceled) {
          setExpenseTargets(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (!canceled) {
          setExpenseError(fetchError);
          setExpenseTargets([]);
        }
      } finally {
        if (!canceled) {
          setExpenseLoading(false);
        }
      }
    };

    loadInvoices();
    loadExpenses();

    return () => {
      canceled = true;
    };
  }, [showManualReconciliation, activeCompany?.id]);

  const closeManualReconciliation = () => {
    setSelectedTransaction(null);
    setSelectedTarget(null);
    setActiveTargetTab('invoices');
    setManualConfirmChecked(false);
    setManualReason('');
    setManualError(null);
  };

  const openManualReconciliation = (transaction) => {
    setSelectedTransaction(transaction);
    setManualConfirmChecked(false);
    setManualReason('');
    setManualError(null);
    setManualSuccessMessage('');
  };

  const handleTargetSelection = (type, item) => {
    setSelectedTarget({ type, item });
    setManualConfirmChecked(false);
    setManualError(null);
  };

  const getTargetLabel = (type, item) => {
    if (type === 'invoices') {
      return item.invoiceNumber || item.number || `Invoice ${item.id ?? ''}`.trim();
    }
    return item.description || item.title || `Expense ${item.id ?? ''}`.trim();
  };

  const getTargetAmount = (type, item) => {
    if (type === 'invoices') {
      return item.total ?? item.amount ?? 0;
    }
    return item.amount ?? 0;
  };

  const getTargetDate = (type, item) => {
    return item.date || item.issueDate || item.createdAt || '';
  };

  const getTargetStatus = (type, item) => {
    if (type === 'invoices') {
      return item.status || 'Unknown';
    }
    return item.status || 'Recorded';
  };

  const renderTargetList = (type) => {
    const items = type === 'invoices' ? invoiceTargets : expenseTargets;
    const loading = type === 'invoices' ? invoiceLoading : expenseLoading;
    const error = type === 'invoices' ? invoiceError : expenseError;

    if (loading) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-sm text-gray-600">
          <LoadingSpinner size="small" />
          Loading {type === 'invoices' ? 'invoices' : 'expenses'}…
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message || 'Unable to load items.'}
        </div>
      );
    }

    if (!items.length) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-sm text-gray-600">
          No {type === 'invoices' ? 'invoices' : 'expenses'} are available to link right now.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item) => {
          const isActive =
            selectedTarget?.type === type && selectedTarget?.item?.id === item.id;
          return (
            <button
              key={`${type}-${item.id}`}
              type="button"
              onClick={() => handleTargetSelection(type, item)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400/80'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getTargetLabel(type, item)}
                </p>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(getTargetAmount(type, item), item.currency)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>Date: {getTargetDate(type, item) ? formatDate(getTargetDate(type, item)) : '—'}</span>
                <span>Status: {getTargetStatus(type, item)}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  if (!activeCompany) {
    return (
      <div className="space-y-6">
        <ReadOnlyBanner message={READ_ONLY_DETAIL_MESSAGE} />
        <EmptyState
          title="No company selected"
          description="Bank statement transactions are scoped to the active company. Choose one first."
          action={
            <Link
              to="/companies"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
            >
              Select company
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReadOnlyBanner message={READ_ONLY_DETAIL_MESSAGE} />
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
          {statusExplanation && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status explanation
              </p>
              <p className="mt-1">{statusExplanation}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/bank-statements">
            <Button variant="outline" size="medium">
              Back to list
            </Button>
          </Link>
          <PermissionGuard action="bank:write" role={user?.role}>
            <Button variant="primary" size="medium" onClick={() => navigate('/bank-statements/import')}>
              Import bank statement
            </Button>
          </PermissionGuard>
          <Button variant="secondary" size="medium" onClick={refreshStatementView} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={() => {
              navigate(`/bank-statements/${statementId}/reconciliation-preview`, {
                state: { statement: statementSummary, transactions },
              });
            }}
            disabled={isReadOnlySession}
            title="Preview only – no changes are made"
          >
            Simulate reconciliation (no data will be changed)
          </Button>
        </div>
      </div>
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError.message}
        </div>
      )}
      {manualSuccessMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {manualSuccessMessage}
        </div>
      )}
      {undoSuccessMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {undoSuccessMessage}
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
              const reconciliationLog = getLatestReconciliationLog(transaction.id);
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
                      {!transaction.isReconciled && !isReadOnlySession && (
                        <PermissionGuard action="bank:write" role={user?.role}>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => openManualReconciliation(transaction)}
                            disabled={busy}
                          >
                            Reconcile manually
                          </Button>
                        </PermissionGuard>
                      )}
                      {transaction.isReconciled && (
                        <PermissionGuard action="bank:undo" role={user?.role}>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => openUndoModal(transaction)}
                            disabled={busy}
                          >
                            Undo reconciliation
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>
                    {transaction.isReconciled && reconciliationLog && (
                      <div className="mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                        <p>
                          Reconciled with {getAuditTargetLabel(reconciliationLog)} by{' '}
                          {getAuditActorName(reconciliationLog)} on {formatDateTime(reconciliationLog.timestamp)}.
                        </p>
                        {reconciliationLog.reason && (
                          <p className="mt-1">Reason: {reconciliationLog.reason}</p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white/80 px-5 py-4 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Audit log</p>
            <p className="text-xs text-gray-500">Read-only history of reconciliation decisions for this statement.</p>
          </div>
          {auditLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <LoadingSpinner size="small" />
              Loading entries…
            </div>
          )}
        </div>
        {auditError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {auditError.message}
          </div>
        )}
        {auditLogs.length ? (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="space-y-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <span>{formatDateTime(log.timestamp)}</span>
                  <span>{log.user?.role || 'System'}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getAuditActionLabel(log.action)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getAuditTargetLabel(log)} · {getAuditActorName(log)}
                </p>
                {log.reason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reason: {log.reason}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">
            No audit entries recorded for this statement yet.
          </div>
        )}
      </div>
      <Modal
        open={showManualReconciliation}
        onClose={closeManualReconciliation}
        title="Manual reconciliation"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                This is a preparation step. No data will be changed yet.
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Manual reconciliation links this bank transaction to an invoice or expense so your books stay accurate.
              </p>
              <div className="space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Transaction details
                </p>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(selectedTransaction.transactionDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Description</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedTransaction.description || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {TARGET_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTargetTab(tab.id)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                      activeTargetTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                No reconciliation has been performed yet. This is still a preparation step.
              </div>
              {activeTargetTab === 'invoices'
                ? renderTargetList('invoices')
                : renderTargetList('expenses')}
              {selectedTarget && (
                <div className="space-y-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Before / after preview
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Before</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Date: {formatDate(selectedTransaction.transactionDate)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Description: {selectedTransaction.description || '—'}
                      </p>
                    </div>
                    <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">After</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedTarget.type === 'invoices'
                          ? `Will be linked to Invoice ${getTargetLabel(
                              'invoices',
                              selectedTarget.item,
                            )}`
                          : `Will be linked to Expense ${getTargetLabel('expenses', selectedTarget.item)}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Status: {getTargetStatus(selectedTarget.type, selectedTarget.item)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {selectedTarget && (
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Final confirmation</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This action creates an audit log entry and marks the transaction as reconciled.
                </p>
                <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    id="manual-reconciliation-understand"
                    type="checkbox"
                    checked={manualConfirmChecked}
                    onChange={(event) => {
                      setManualConfirmChecked(event.target.checked);
                      setManualError(null);
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    "I understand this action will be recorded and can only be undone manually."
                  </span>
                </label>
                <label
                  className="text-sm text-gray-600 dark:text-gray-300"
                  htmlFor="manual-reconciliation-reason"
                >
                  Reason (optional)
                  <textarea
                    id="manual-reconciliation-reason"
                    value={manualReason}
                    onChange={(event) => setManualReason(event.target.value)}
                    rows={3}
                    placeholder="Optional notes for auditors"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </label>
                {manualError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {manualError.message}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="medium" onClick={closeManualReconciliation}>
                Close
              </Button>
              {selectedTarget && (
                <PermissionGuard action="bank:write" role={user?.role}>
                  <Button
                    variant="success"
                    size="medium"
                    onClick={handleManualConfirm}
                    loading={isReconcilingManually}
                    disabled={
                      isReconcilingManually ||
                      !manualConfirmChecked ||
                      isReadOnlySession ||
                      !selectedTarget
                    }
                  >
                    Confirm reconciliation
                  </Button>
                </PermissionGuard>
              )}
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={Boolean(selectedUndoTransaction)}
        onClose={closeUndoModal}
        title="Undo reconciliation"
      >
        {selectedUndoTransaction && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Undo manual confirmation
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This reinstates immutability safeguards and records the undo action with a new audit entry.
              </p>
              <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                <p className="text-xs text-gray-500">Transaction</p>
                <p className="font-semibold">{selectedUndoTransaction.description || '—'}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(selectedUndoTransaction.transactionDate)} •{' '}
                  {formatCurrency(selectedUndoTransaction.amount, selectedUndoTransaction.currency)}
                </p>
              </div>
            </div>
            <label className="block text-sm text-gray-600 dark:text-gray-300" htmlFor="undo-reason">
              Reason (required)
              <textarea
                id="undo-reason"
                rows={3}
                value={undoReason}
                onChange={(event) => {
                  setUndoReason(event.target.value);
                  setUndoError(null);
                }}
                placeholder="Describe why the reconciliation should be reverted"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
              <input
                id="undo-confirm"
                type="checkbox"
                checked={undoConfirmChecked}
                onChange={(event) => {
                  setUndoConfirmChecked(event.target.checked);
                  setUndoError(null);
                }}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                I understand this action is audited, irreversible, and must be handled individually.
              </span>
            </label>
            {undoError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {undoError.message}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" size="medium" onClick={closeUndoModal}>
                Close
              </Button>
              <PermissionGuard action="bank:undo" role={user?.role}>
                <Button
                  variant="danger"
                  size="medium"
                  onClick={handleUndoReconciliation}
                  loading={isUndoing}
                  disabled={
                    isUndoing || !undoConfirmChecked || !undoReason.trim()
                  }
                >
                  Undo reconciliation
                </Button>
              </PermissionGuard>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankStatementDetail;
