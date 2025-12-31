import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  PageLoadingState,
  PageEmptyState,
  PageErrorState,
  PageNoAccessState,
} from '../components/ui/PageStates';
import InvoiceStatusBadge from '../components/invoices/InvoiceStatusBadge';
import { formatApiError } from '../services/api';
import { invoicesAPI } from '../services/invoicesAPI';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole } from '../lib/rbac';
import PermissionGuard from '../components/PermissionGuard';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 6;

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

const Invoices = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [page, setPage] = useState(1);

  const fetchInvoices = useCallback(async () => {
    if (!activeCompany) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await invoicesAPI.list({ companyId: activeCompany.id });
      setInvoices(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(formatApiError(fetchError, 'Unable to load invoices.'));
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    if (!activeCompany) {
      setInvoices([]);
      setError(null);
      setLoading(false);
      return;
    }

    setPage(1);
    fetchInvoices();
  }, [activeCompany, fetchInvoices]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesStatus = filters.status === 'all' || invoice.status === filters.status;
      const search = filters.search.trim().toLowerCase();
      const matchesSearch =
        !search ||
        invoice.invoiceNumber?.toLowerCase().includes(search) ||
        invoice.clientName?.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [filters, invoices]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, page]);

  const showingStart = filteredInvoices.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(filteredInvoices.length, page * PAGE_SIZE);

  if (!activeCompany) {
    return <PageNoAccessState />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">
            All invoices for <span className="font-semibold">{activeCompany.name}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard action="invoice.create" role={user?.role}>
            <Link to="/invoices/create">
              <Button variant="primary" size="md">
                New Invoice
              </Button>
            </Link>
          </PermissionGuard>
        </div>
      </div>
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode="Viewer" message={t('states.read_only.invoices_notice')} />
      )}
      <Card>
        <div className="space-y-6">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
              Search
              <input
                type="search"
                placeholder="Invoice number or client"
                className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
                disabled={loading}
                aria-label="Search invoices"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700 dark:text-gray-200">
              Status
              <select
                className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
                disabled={loading}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {/* Table or states */}
          {loading ? (
            <PageLoadingState />
          ) : error ? (
            <PageErrorState onRetry={fetchInvoices} />
          ) : filteredInvoices.length === 0 ? (
            <PageEmptyState
              action={
                <PermissionGuard action="invoice.create" role={user?.role}>
                  <Link to="/invoices/create">
                    <Button variant="primary" size="md">
                      {t('states.empty.action')}
                    </Button>
                  </Link>
                </PermissionGuard>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Issue Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{invoice.clientName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(invoice.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={invoice.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <PermissionGuard action="invoice.edit" role={user?.role}>
                            <Link
                              to={`/invoices/${invoice.id}/edit`}
                              className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                            >
                              Edit
                            </Link>
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                <p>
                  Showing {showingStart} - {showingEnd} of {filteredInvoices.length} invoices
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Invoices;
