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
        description="Choose an active company before creating invoices."
        actionText="Select company"
        action={() => navigate('/companies')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode={readOnlyBannerMode(user?.role)} message="You have read-only access. Creating invoices is disabled." />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">New invoice</p>
          <h1 className="text-3xl font-bold text-gray-900">{activeCompany.name}</h1>
          <p className="text-sm text-gray-500">Create invoice linked to {activeCompany.name}.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/invoices')}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message}
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
