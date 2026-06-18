import { useCallback, useEffect, useMemo, useState } from 'react';
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
import InvoiceStatusBadge from '../components/invoices/InvoiceStatusBadge';
import { formatApiError } from '../services/api';
import { invoicesAPI } from '../services/invoicesAPI';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { canEditInvoices, isReadOnlyRole } from '../lib/rbac';
import PermissionGuard from '../components/PermissionGuard';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'overdue', label: 'Overdue' },
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

const STATUS_HELP = {
  draft: 'Draft: You can edit or issue this invoice.',
  issued: 'Issued: This invoice is legally binding and cannot be edited.',
  partially_paid: 'Partially paid: A payment has been recorded and the invoice remains locked.',
  overdue: 'Overdue: Payment is past due and the invoice remains locked.',
  paid: 'Paid: This invoice is settled and locked.',
  cancelled: 'Cancelled: This invoice is void and locked.',
};

const formatStatusLabel = (status) =>
  String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const Invoices = () => {
  // GDPR retention period (Germany: 10 years)
  const RETENTION_PERIOD_YEARS = 10;
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [page, setPage] = useState(1);
  const canViewLegalData = user?.role === 'admin' || user?.role === 'accountant';
  const canWriteInvoices = canEditInvoices(user?.role);

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
          title="Ask AI about invoices"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('open-ai-assistant', { detail: { context: 'invoices' } }),
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
        current company’s invoices, status, and visible details on this page. No generic
        questions—AI answers are always based on the invoices you see here.
      </div>
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            All invoices for <span className="font-semibold">{activeCompany.name}</span>
          </p>
        </div>
        {canWriteInvoices && (
          <div className="flex flex-wrap gap-2">
            <PermissionGuard action="invoice.create" role={user?.role}>
              <Link to="/invoices/create">
                <Button variant="primary" size="md">
                  New Invoice
                </Button>
              </Link>
            </PermissionGuard>
            <PermissionGuard action="invoice.create" role={user?.role}>
              <Link to="/invoices/import">
                <Button variant="secondary" size="md">
                  Import Invoices
                </Button>
              </Link>
            </PermissionGuard>
          </div>
        )}
      </div>
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode="Read-only" message={t('states.read_only.invoices_notice')} />
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
                canWriteInvoices ? (
                  <PermissionGuard action="invoice.create" role={user?.role}>
                    <Link to="/invoices/create">
                      <Button variant="primary" size="md">
                        {t('states.empty.action')}
                      </Button>
                    </Link>
                  </PermissionGuard>
                ) : null
              }
              title={filters.search || filters.status !== 'all' ? 'No invoices match your filters' : 'No invoices yet'}
              description={
                filters.search || filters.status !== 'all'
                  ? 'Adjust the search or status filter to widen the result set.'
                  : 'Create a draft invoice or import a batch to start tracking receivables.'
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                      >
                        Invoice #
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                      >
                        Client
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                      >
                        Issue Date
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300"
                      >
                        Due Date
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
                    {paginatedInvoices.map((invoice) => {
                      const isLocked = invoice.status !== 'draft';
                      const clientName =
                        !isLocked || canViewLegalData ? invoice.clientName : 'Masked';
                      const clientTitle =
                        !isLocked || canViewLegalData
                          ? undefined
                          : 'Personal data masked for GDPR compliance';

                      return (
                        <tr
                          key={invoice.id}
                          className="hover:bg-blue-50/60 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {invoice.invoiceNumber}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-600 dark:text-gray-200"
                            title={clientTitle}
                          >
                            {clientName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {formatDate(invoice.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {formatDate(invoice.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {formatCurrency(invoice.total, invoice.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <InvoiceStatusBadge status={invoice.status} />
                              {isLocked && (
                                <span
                                  className="inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800"
                                  title="Locked accounting records cannot be edited or deleted under GoBD retention rules."
                                >
                                  Locked
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                              {STATUS_HELP[invoice.status] || ''}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {invoice.status === 'draft' && canWriteInvoices ? (
                              <PermissionGuard action="invoice.edit" role={user?.role}>
                                <Link
                                  to={`/invoices/${invoice.id}/edit`}
                                  className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                                >
                                  Edit
                                </Link>
                              </PermissionGuard>
                            ) : (
                              <div className="flex flex-col items-start gap-2">
                                <Link
                                  to={`/invoices/${invoice.id}/edit`}
                                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                  View
                                </Link>
                                <span className="text-xs text-gray-500 dark:text-gray-300">
                                  {invoice.status === 'draft'
                                    ? 'Read-only for your role.'
                                    : `${formatStatusLabel(invoice.status)} invoices are locked for editing.`}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
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
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-300">
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
