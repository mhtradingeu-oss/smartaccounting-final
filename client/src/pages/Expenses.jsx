import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  PageLoadingState,
  PageEmptyState,
  PageErrorState,
  PageNoAccessState,
} from '../components/ui/PageStates';
import { expensesAPI, normalizeExpenseStatus } from '../services/expensesAPI';
import { formatApiError } from '../services/api';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import PermissionGuard from '../components/PermissionGuard';
import { can, isReadOnlyRole } from '../lib/permissions';

const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatCurrency = (value, currency = 'EUR') => {
  if (value === undefined || value === null) {
    return '-';
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(value);
};

const STATUS_LABELS = {
  pending: 'Pending',
  booked: 'Booked',
  archived: 'Archived',
};

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100',
  booked: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100',
  archived: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
};

const Expenses = () => {
  // GDPR retention period (Germany: 10 years)
  const RETENTION_PERIOD_YEARS = 10;
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const companyId = activeCompany?.id ?? null;
  const canViewLegalData = user?.role === 'admin' || user?.role === 'accountant';
  const canChangeStatus = can('expense.create', user?.role);

  const fetchExpenses = useCallback(async () => {
    if (!companyId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await expensesAPI.list({ companyId });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.expenses)
          ? data.expenses
          : Array.isArray(data?.data)
            ? data.data
            : [];
      setExpenses(items);
    } catch (fetchError) {
      setError(formatApiError(fetchError, 'Unable to load expenses.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const handleStatusChange = async (expenseId, status) => {
    if (!companyId) {
      return;
    }
    setStatusUpdatingId(expenseId);
    setError(null);
    try {
      const response = await expensesAPI.updateStatus(expenseId, status, { companyId });
      const updatedExpense = response?.expense;
      setExpenses((current) =>
        current.map((expense) => (expense.id === expenseId && updatedExpense ? updatedExpense : expense)),
      );
      await fetchExpenses();
    } catch (statusError) {
      setError(formatApiError(statusError, 'Unable to update expense status.'));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  useEffect(() => {
    if (!companyId) {
      setExpenses([]);
      setError(null);
      setLoading(false);
      return;
    }
    fetchExpenses();
  }, [companyId, fetchExpenses]);

  if (!activeCompany) {
    return <PageNoAccessState />;
  }

  if (loading) {
    return <PageLoadingState />;
  }

  if (error) {
    return <PageErrorState onRetry={fetchExpenses} />;
  }

  if (!expenses.length) {
    return (
      <PageEmptyState
        action={
          <PermissionGuard action="expense.create" role={user?.role}>
            <Link to="/expenses/create">
              <Button variant="primary" size="md">
                {t('states.empty.action')}
              </Button>
            </Link>
          </PermissionGuard>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* GDPR Retention Banner */}
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 mb-2 text-xs text-blue-900 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-100">
        <strong>Retention period:</strong> {RETENTION_PERIOD_YEARS} years (GoBD, HGB, AO).
        Locked accounting records cannot be edited or deleted. Personal data may be masked depending
        on role.
      </div>
      {/* Contextual AI entry point */}
      <div className="flex justify-end mb-2">
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 text-sm font-medium shadow-sm"
          title="Ask AI about expenses"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('open-ai-assistant', { detail: { context: 'expenses' } }),
            )
          }
        >
          <span role="img" aria-label="AI">
            🤖
          </span>{' '}
          Ask AI
        </button>
      </div>
      <div className="mb-2 text-xs text-gray-500 dark:text-gray-300">
        <span className="font-semibold">What does AI see?</span> The assistant will only see your
        current company’s expenses, amounts, and visible details on this page. No generic
        questions—AI answers are always based on the expenses you see here.
      </div>
      <div className="mb-6">
        {/* h1 matches sidebar label exactly */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
        {/* Subtitle for first-time user clarity */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This page shows all company expenses in one place. You can review spending, see details
          for each expense, and keep track of costs over time.
        </p>
      </div>
      {/* Read-only explanation for restricted users */}
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode="Read-only" message={t('states.read_only.expenses_notice')} />
      )}
      <Card>
        <div className="mb-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                >
                  Vendor
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {expenses.map((expense) => {
                const status = normalizeExpenseStatus(expense.status);
                const isLocked = status !== 'pending';
                const description =
                  !isLocked || canViewLegalData ? expense.description : 'Masked';
                const vendor =
                  !isLocked || canViewLegalData ? expense.vendor || expense.vendorName : 'Masked';
                const maskedTitle =
                  !isLocked || canViewLegalData
                    ? undefined
                    : 'Personal data masked for GDPR compliance';
                const isExpanded = expandedExpenseId === expense.id;
                const isUpdating = statusUpdatingId === expense.id;
                const actions = [];
                if (canChangeStatus && status === 'pending') {
                  actions.push({ label: 'Book', status: 'booked', variant: 'primary' });
                  actions.push({ label: 'Archive', status: 'archived', variant: 'secondary' });
                } else if (canChangeStatus && status === 'booked') {
                  actions.push({ label: 'Archive', status: 'archived', variant: 'secondary' });
                }

                return (
                  <Fragment key={expense.id}>
                    <tr className="hover:bg-blue-50/60 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(expense.date || expense.expenseDate)}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                        title={maskedTitle}
                      >
                        {description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatCurrency(expense.amount || expense.grossAmount, expense.currency)}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                        title={maskedTitle}
                      >
                        {vendor}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedExpenseId(isExpanded ? null : expense.id)}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </Button>
                          {actions.map((action) => (
                            <Button
                              key={action.status}
                              size="sm"
                              variant={action.variant}
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(expense.id, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                          {!actions.length && (
                            <span className="self-center text-xs text-gray-500 dark:text-gray-300">
                              {status === 'archived' ? 'No further actions' : 'Read-only'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-gray-800/70">
                        <td colSpan={6} className="px-4 py-4">
                          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <dt className="font-semibold text-gray-600 dark:text-gray-300">Net</dt>
                              <dd className="text-gray-900 dark:text-white">
                                {formatCurrency(expense.netAmount, expense.currency)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-gray-600 dark:text-gray-300">VAT</dt>
                              <dd className="text-gray-900 dark:text-white">
                                {formatCurrency(expense.vatAmount, expense.currency)} (
                                {Number(expense.vatRate || 0) * 100}%)
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-gray-600 dark:text-gray-300">
                                Gross
                              </dt>
                              <dd className="text-gray-900 dark:text-white">
                                {formatCurrency(expense.grossAmount || expense.amount, expense.currency)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-semibold text-gray-600 dark:text-gray-300">
                                Source
                              </dt>
                              <dd className="text-gray-900 dark:text-white">
                                {expense.source || 'manual'}
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Expenses;
