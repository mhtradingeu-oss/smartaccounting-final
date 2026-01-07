import { useCallback, useEffect, useState } from 'react';
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
import { expensesAPI } from '../services/expensesAPI';
import { formatApiError } from '../services/api';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import PermissionGuard from '../components/PermissionGuard';
import { isReadOnlyRole } from '../lib/permissions';

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

const Expenses = () => {
  // GDPR retention period (Germany: 10 years)
  const RETENTION_PERIOD_YEARS = 10;
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const companyId = activeCompany?.id ?? null;

  const fetchExpenses = useCallback(async () => {
    if (!companyId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await expensesAPI.list({ companyId });
      setExpenses(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(formatApiError(fetchError, 'Unable to load expenses.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

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
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 mb-2 text-xs text-blue-900">
        <strong>Retention period:</strong> {RETENTION_PERIOD_YEARS} years (GoBD, HGB, AO).
        Accounting records cannot be deleted during this time, even for GDPR requests. Personal data
        is masked unless required by law.
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
      <div className="mb-2 text-xs text-gray-500">
        <span className="font-semibold">What does AI see?</span> The assistant will only see your
        current company’s expenses, amounts, and visible details on this page. No generic
        questions—AI answers are always based on the expenses you see here.
      </div>
      <div className="mb-6">
        {/* h1 matches sidebar label exactly */}
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        {/* Subtitle for first-time user clarity */}
        <p className="text-sm text-gray-600">
          This page shows all company expenses in one place. You can review spending, see details
          for each expense, and keep track of costs over time.
        </p>
      </div>
      {/* Read-only explanation for restricted users */}
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode="Read-only" message={t('states.read_only.expenses_notice')} />
      )}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Vendor
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.date)}</td>
                  {/* Mask description if it contains personal data */}
                  <td title="Personal data masked for GDPR compliance">
                    {expense.status === 'draft' ? expense.description : 'Masked'}
                  </td>
                  <td>{formatCurrency(expense.amount, expense.currency)}</td>
                  {/* Mask vendor name unless strictly needed */}
                  <td title="Personal data masked for GDPR compliance">
                    {expense.status === 'draft' ? expense.vendor : 'Masked'}
                  </td>
                  <td>
                    <span className="text-xs text-gray-500" title="Status meaning">
                      {expense.status === 'draft' && 'Draft: You can edit or post this expense.'}
                      {expense.status === 'posted' &&
                        'Posted: This expense is finalized and cannot be edited.'}
                      {expense.status === 'reimbursed' &&
                        'Reimbursed: This expense is settled and locked.'}
                      {expense.status === 'cancelled' &&
                        'Cancelled: This expense is void and locked.'}
                    </span>
                    {expense.status !== 'draft' ? (
                      <div className="flex flex-col items-start">
                        <span
                          className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold"
                          title="GoBD Immutability"
                        >
                          Legally locked (GoBD)
                        </span>
                        <span className="mt-1 text-xs text-red-700 font-semibold">
                          This record is legally locked (GoBD). Edits and deletions are prohibited
                          by German accounting law.
                          <br />
                          <span className="text-blue-900">
                            GDPR requests for deletion cannot be fulfilled for accounting records
                            due to mandatory retention.
                          </span>
                        </span>
                        <span className="mt-1 text-xs text-gray-500">
                          Status: {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                          .{' '}
                          {expense.status === 'posted' &&
                            'You cannot revert to draft or reimbursed directly.'}
                          {expense.status === 'reimbursed' &&
                            'You cannot revert to posted or draft.'}
                          {expense.status === 'cancelled' &&
                            'You cannot revert to any other status.'}
                        </span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled
                        title="Expense detail view is coming soon."
                        className="cursor-not-allowed"
                      >
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Expenses;
