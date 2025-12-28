import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { expensesAPI } from '../services/expensesAPI';
import { formatApiError } from '../services/api';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import PermissionGuard from '../components/PermissionGuard';
import { isReadOnlyRole } from '../lib/permissions';

// PAGE_SIZE not used

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
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!activeCompany) {
      return;
    }
    setLoading(true);
    setError(null);
    setError(null);
    try {
      const data = await expensesAPI.list({ companyId: activeCompany.id });
      setExpenses(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(formatApiError(fetchError, 'Unable to load expenses.'));
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    if (!activeCompany) {
      setExpenses([]);
      setError(null);
      setLoading(false);
      return;
    }
    fetchExpenses();
  }, [activeCompany, fetchExpenses]);

  // Loader
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={fetchExpenses} />;
  }

  // Empty state
  if (!expenses.length) {
    return (
      <EmptyState
        title="No expenses yet"
        description="Create your first expense to get started."
        action={
          <PermissionGuard action="expense.create" role={user?.role}>
            <Link to="/expenses/create">
              <Button variant="primary">Create Expense</Button>
            </Link>
          </PermissionGuard>
        }
      />
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner message="You have read-only access. Expenses are view-only." />
      )}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Expenses</h2>
          <PermissionGuard action="expense.create" role={user?.role}>
            <Link to="/expenses/create">
              <Button variant="primary">Create Expense</Button>
            </Link>
          </PermissionGuard>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Vendor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{formatDate(expense.date)}</td>
                <td>{expense.description}</td>
                <td>{formatCurrency(expense.amount, expense.currency)}</td>
                <td>{expense.vendor}</td>
                <td>
                  <Button
                    size="sm"
                    disabled
                    title="Expense detail view is coming soon."
                    className="cursor-not-allowed"
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default Expenses;
