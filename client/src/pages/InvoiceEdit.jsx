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
  ],
  issued: [
    { label: 'Mark as paid', nextStatus: 'paid', variant: 'success' },
    { label: 'Cancel invoice', nextStatus: 'cancelled', variant: 'danger' },
  ],
  paid: [],
  cancelled: [],
};

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

  const loadInvoice = useCallback(async () => {
    if (!activeCompany) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await invoicesAPI.list({ companyId: activeCompany.id });
      const list = Array.isArray(data) ? data : [];
      const found = list.find((item) => String(item.id) === String(invoiceId));
      if (!found) {
        setError({ message: 'Invoice not found.', status: 404 });
        setInvoice(null);
      } else {
        setInvoice(found);
      }
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

  const handleUpdate = async (formValues) => {
    if (!invoice || invoice.status !== 'draft') {
      return;
    }

    setFormSubmitting(true);
    setActionError(null);
    try {
      const updated = await invoicesAPI.update(invoiceId, formValues);
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
      const updated = await invoicesAPI.update(invoiceId, { status: nextStatus });
      setInvoice(updated);
    } catch (transitionError) {
      setActionError(formatApiError(transitionError, 'Unable to update status.'));
    } finally {
      setStatusUpdating(null);
    }
  };

  const canEdit = invoice?.status === 'draft';

  const transitionButtons = useMemo(() => {
    if (!invoice) {
      return [];
    }
    return STATUS_TRANSITIONS[invoice.status] || [];
  }, [invoice]);

  if (!activeCompany) {
    return (
      <EmptyState
        title="No active company"
        description="Select a company before editing invoices."
        actionText="Select company"
        action={() => navigate('/companies')}
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
        <ReadOnlyBanner mode={readOnlyBannerMode(user?.role)} message="You have read-only access. Editing invoices is disabled." />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-gray-500">{invoice.clientName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/invoices')}>
            Back to list
          </Button>
          <Button variant="outline" onClick={loadInvoice}>
            Refresh
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError.message}
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <PermissionGuard action="invoice.edit" role={user?.role}>
            <InvoiceForm
              initialValues={{
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                date: invoice.date,
                dueDate: invoice.dueDate,
                currency: invoice.currency,
                subtotal: invoice.subtotal,
                total: invoice.total,
                notes: invoice.notes || '',
              }}
              onSubmit={handleUpdate}
              loading={formSubmitting}
              disabled={!canEdit || formSubmitting}
              submitLabel="Save changes"
            />
          </PermissionGuard>

          {(!canEdit || !canEditInvoices(user?.role)) && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {!canEditInvoices(user?.role)
                ? 'You do not have permission to edit invoices.'
                : 'Only draft invoices can be edited. Use the available status actions to move the invoice forward in the lifecycle.'}
            </div>
          )}
        </div>
      </Card>

      {transitionButtons.length > 0 && (
        <Card>
          <div className="flex flex-wrap gap-3">
            {transitionButtons.map((action) => (
              <PermissionGuard action="invoice.updateStatus" role={user?.role} key={action.nextStatus}>
                <Button
                  variant={action.variant}
                  onClick={() => handleStatusTransition(action.nextStatus)}
                  loading={statusUpdating === action.nextStatus}
                >
                  {action.label}
                </Button>
              </PermissionGuard>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default InvoiceEdit;
