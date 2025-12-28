import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import InvoiceForm from '../components/invoices/InvoiceForm';
import { formatApiError } from '../services/api';
import { invoicesAPI } from '../services/invoicesAPI';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole, readOnlyBannerMode } from '../lib/rbac';
import PermissionGuard from '../components/PermissionGuard';

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formValues) => {
    if (!activeCompany) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await invoicesAPI.create({
        ...formValues,
        status: 'draft',
        companyId: activeCompany.id,
        userId: user?.id,
      });
      navigate('/invoices', { replace: true });
    } catch (creationError) {
      setError(formatApiError(creationError, 'Failed to create invoice.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeCompany) {
    return (
      <EmptyState
        title="Select a company"
        description="Invoices are scoped per entity. Choose an active company before creating your first invoice."
        action={
          <Button variant="primary" onClick={() => navigate('/companies')}>
            Select company
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Invoices</p>
          <h1 className="text-3xl font-bold text-gray-900">Create invoice</h1>
          <p className="text-sm text-gray-500">
            This invoice will be linked to {activeCompany.name} and saved as a draft until you publish it.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/invoices')}>
          Back to invoices
        </Button>
      </div>

      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner
          mode={readOnlyBannerMode(user?.role)}
          message="You have read-only access. Invoice creation is disabled for your role."
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error?.message || error}
        </div>
      )}

      <Card>
        <PermissionGuard action="invoice.create" role={user?.role}>
          <InvoiceForm
            submitLabel="Create invoice"
            loading={submitting}
            onSubmit={handleSubmit}
            disabled={submitting}
          />
        </PermissionGuard>
      </Card>
    </div>
  );
};

export default InvoiceCreate;
