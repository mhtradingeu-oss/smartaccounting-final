import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import InvoiceForm from '../components/invoices/InvoiceForm';
import InvoiceStatusBadge from '../components/invoices/InvoiceStatusBadge';
import { formatApiError } from '../services/api';
import { invoicesAPI } from '../services/invoicesAPI';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { canEditInvoices, isReadOnlyRole, readOnlyBannerMode } from '../lib/rbac';
import PermissionGuard from '../components/PermissionGuard';

const STATUS_TRANSITIONS = {
  draft: [
    { label: 'Issue invoice', nextStatus: 'issued', variant: 'primary' },
    { label: 'Cancel draft', nextStatus: 'cancelled', variant: 'danger' },
  ],
  issued: [
    { label: 'Mark as partially paid', nextStatus: 'partially_paid', variant: 'secondary' },
    { label: 'Mark as overdue', nextStatus: 'overdue', variant: 'secondary' },
    { label: 'Mark as paid', nextStatus: 'paid', variant: 'primary' },
    { label: 'Cancel invoice', nextStatus: 'cancelled', variant: 'danger' },
  ],
  partially_paid: [
    { label: 'Mark as overdue', nextStatus: 'overdue', variant: 'secondary' },
    { label: 'Mark as paid', nextStatus: 'paid', variant: 'primary' },
  ],
  overdue: [
    { label: 'Mark as paid', nextStatus: 'paid', variant: 'primary' },
    { label: 'Cancel invoice', nextStatus: 'cancelled', variant: 'danger' },
  ],
  paid: [],
  cancelled: [],
};

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
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '-';
  }
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
};

const formatStatus = (status) =>
  String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getLineVat = (item) => Number(item.vatAmount ?? item.lineVat ?? 0);
const getLineGross = (item) => Number(item.grossAmount ?? item.lineGross ?? 0);

const InvoiceTemplatePreview = ({ invoice, company }) => (
  <Card>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded border border-gray-200 bg-gray-50 text-lg font-bold text-gray-700">
            {(company?.name || 'SA').slice(0, 2).toUpperCase()}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-gray-900">{company?.name || 'Company'}</h2>
          <p className="text-sm text-gray-500">{company?.address || 'Company address not set'}</p>
          {company?.taxId && <p className="text-sm text-gray-500">Tax ID: {company.taxId}</p>}
        </div>
        <div className="text-left md:text-right">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Invoice</p>
          <p className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</p>
          <div className="mt-2 flex md:justify-end">
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bill to</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{invoice.clientName || '-'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Issue date</p>
          <p className="mt-1 text-sm text-gray-700">{formatDate(invoice.date)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Due date</p>
          <p className="mt-1 text-sm text-gray-700">{formatDate(invoice.dueDate)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="py-2 pr-4">Item</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">VAT</th>
              <th className="px-4 py-2 text-right">Gross</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(invoice.items || []).map((item, idx) => (
              <tr key={`${item.description}-${idx}`}>
                <td className="py-3 pr-4 font-medium text-gray-900">{item.description || '-'}</td>
                <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                <td className="px-4 py-3 text-gray-700">
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-gray-700">{item.vatRate || 0}%</td>
                <td className="px-4 py-3 text-right text-gray-900">
                  {formatCurrency(getLineGross(item), invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="rounded border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</p>
          <p className="mt-2 text-sm text-gray-700">{invoice.notes || 'No notes added.'}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Payment info
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Payment instructions can be added through company billing settings when available.
          </p>
        </div>
        <div className="space-y-2 rounded border border-gray-200 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(invoice.subtotal, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">VAT</span>
            <span className="font-medium text-gray-900">
              {formatCurrency((invoice.items || []).reduce((sum, item) => sum + getLineVat(item), 0), invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(invoice.total, invoice.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Card>
);

const AuditTrail = ({ entries, loading }) => (
  <Card>
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Audit trail</h2>
        <p className="text-sm text-gray-500">Status and invoice changes recorded for this invoice.</p>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500">Loading audit trail...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">No audit entries recorded for this invoice yet.</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id || `${entry.action}-${entry.timestamp}`} className="rounded border border-gray-200 p-3 text-sm">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <span className="font-medium text-gray-900">{entry.action.replace(/_/g, ' ')}</span>
                <span className="text-xs text-gray-500">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown time'}</span>
              </div>
              {entry.newValues?.status && (
                <p className="mt-1 text-gray-600">
                  Status: {formatStatus(entry.oldValues?.status)} to {formatStatus(entry.newValues.status)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">Actor: {entry.user}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  </Card>
);

const InvoiceEdit = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!activeCompany) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const found = await invoicesAPI.get(invoiceId, { companyId: activeCompany.id });
      if (!found?.id) {
        setError({ message: 'Invoice not found.', status: 404 });
        setInvoice(null);
        return;
      }
      setInvoice(found);
    } catch (fetchError) {
      setError(formatApiError(fetchError, 'Unable to load invoice.'));
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [activeCompany, invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const loadAuditLog = useCallback(async () => {
    if (!activeCompany || !invoiceId) {
      return;
    }
    setAuditLoading(true);
    try {
      const entries = await invoicesAPI.auditLog(invoiceId, { companyId: activeCompany.id });
      setAuditLog(entries);
    } catch {
      setAuditLog([]);
    } finally {
      setAuditLoading(false);
    }
  }, [activeCompany, invoiceId]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const handleUpdate = async (formValues) => {
    if (!invoice || invoice.status !== 'draft') {
      setActionError({ message: 'Only draft invoices can be edited.' });
      return;
    }

    setFormSubmitting(true);
    setActionError(null);
    try {
      const updated = await invoicesAPI.update(invoiceId, {
        ...formValues,
        companyId: activeCompany.id,
      });
      setInvoice(updated);
    } catch (updateError) {
      setActionError(formatApiError(updateError, 'Unable to save changes.'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusTransition = async (nextStatus) => {
    if (!invoice || statusUpdating) {
      return;
    }

    setStatusUpdating(nextStatus);
    setActionError(null);
    try {
      const updated = await invoicesAPI.update(invoiceId, {
        status: nextStatus,
        companyId: activeCompany.id,
      });
      setInvoice(updated);
      loadAuditLog();
    } catch (transitionError) {
      setActionError(formatApiError(transitionError, 'Unable to update status.'));
    } finally {
      setStatusUpdating(null);
    }
  };

  const canWriteInvoices = canEditInvoices(user?.role);
  const canEdit = invoice?.status === 'draft' && canWriteInvoices;
  const isReadOnly = !canEdit;

  const transitionButtons = useMemo(() => {
    if (!invoice) {
      return [];
    }
    return STATUS_TRANSITIONS[invoice.status] || [];
  }, [invoice]);

  const initialFormValues = useMemo(() => {
    if (!invoice) {
      return null;
    }
    return {
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      date: invoice.date,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      total: invoice.total,
      notes: invoice.notes || '',
      status: invoice.status,
      items: invoice.items || [],
      vatSummary: invoice.vatSummary,
      createdAt: invoice.createdAt,
    };
  }, [invoice]);

  if (!activeCompany) {
    return (
      <EmptyState
        title="No active company"
        description="Select a company before editing invoices."
        action={
          <Button variant="primary" onClick={() => navigate('/companies')}>
            Select company
          </Button>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <LoadingSpinner size="lg" />
        <p className="mt-3 text-sm text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold text-red-600">{error.message}</p>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={loadInvoice}>
              Retry
            </Button>
            <Link to="/invoices" className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1 text-sm font-medium text-blue-600">
              Back to invoices
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <p className="text-sm text-gray-600">Invoice not found.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode={readOnlyBannerMode(user?.role)} message="You have read-only access. Invoice changes and status actions are disabled." />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-gray-500">
            {invoice.clientName} · {isReadOnly ? 'Read-only invoice view' : 'Editable draft'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/invoices')}>
            Back to list
          </Button>
          <Button variant="outline" onClick={loadInvoice}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="outline" disabled title="PDF export is not connected yet.">
            Download PDF
          </Button>
          {canWriteInvoices &&
            transitionButtons.map((action) => (
              <PermissionGuard action="invoice.updateStatus" role={user?.role} key={action.nextStatus}>
                <Button
                  variant={action.variant}
                  onClick={() => handleStatusTransition(action.nextStatus)}
                  loading={statusUpdating === action.nextStatus}
                  disabled={Boolean(statusUpdating)}
                >
                  {action.label}
                </Button>
              </PermissionGuard>
            ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError.message}
        </div>
      )}

      {canEdit ? (
        <Card>
          <div className="space-y-6">
            <InvoiceForm
              initialValues={initialFormValues || undefined}
              onSubmit={handleUpdate}
              loading={formSubmitting}
              disabled={!canEdit || formSubmitting}
              submitLabel="Save changes"
            />
            <p className="text-xs text-gray-500">
              Draft invoices can be edited until they are issued or cancelled.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            {!canWriteInvoices
              ? 'Your role can view invoices, but editing and status changes are restricted to admins and accountants.'
              : `This invoice is ${formatStatus(invoice.status)} and cannot be edited. Use available status actions only.`}
          </div>
        </Card>
      )}

      <InvoiceTemplatePreview invoice={invoice} company={activeCompany} />
      <AuditTrail entries={auditLog} loading={auditLoading} />
    </div>
  );
};

export default InvoiceEdit;
