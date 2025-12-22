import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { formatApiError } from '../services/api';
import { companiesAPI } from '../services/companiesAPI';

import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import PermissionGuard from '../components/PermissionGuard';
import { isReadOnlyRole } from '../lib/permissions';

const initialFormState = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
};

const Companies = () => {
  const { companies, setCompanies, activeCompany, switchCompany } = useCompany();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formState, setFormState] = useState(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const activeCompanyRef = useRef(activeCompany?.id ?? null);

  useEffect(() => {
    activeCompanyRef.current = activeCompany?.id ?? null;
  }, [activeCompany]);

  const refreshCompanies = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await companiesAPI.list();
      const list = Array.isArray(data) ? data : data?.companies ?? [];
      setCompanies(list);
      if (list.length) {
        const matchedActive = list.find((c) => c.id === activeCompanyRef.current);
        const newActive = matchedActive || list[0];
        switchCompany(newActive, { reset: false });
      } else {
        switchCompany(null, { reset: false });
      }
    } catch (error) {
      setLoadError(formatApiError(error, 'Unable to load company data.'));
    } finally {
      setLoading(false);
    }
  }, [setCompanies, switchCompany]);

  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  useEffect(() => {
    if (!activeCompany) {
      setFormState(initialFormState);
      return;
    }

    setFormState({
      name: activeCompany.name || '',
      address: activeCompany.address || '',
      city: activeCompany.city || '',
      postalCode: activeCompany.postalCode || '',
      country: activeCompany.country || '',
    });
  }, [activeCompany]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!activeCompany) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage('');
    try {
      const payload = {
        name: formState.name.trim(),
        address: formState.address.trim(),
        city: formState.city.trim(),
        postalCode: formState.postalCode.trim(),
        country: formState.country.trim(),
      };

      await companiesAPI.update(activeCompany.id, payload);

      const updatedCompany = { ...activeCompany, ...payload };
      setCompanies((prev) => prev.map((company) => (company.id === updatedCompany.id ? updatedCompany : company)));
      switchCompany(updatedCompany, { reset: false });
      setSuccessMessage('Company profile saved.');
    } catch (error) {
      setSaveError(formatApiError(error, 'Unable to save company details.'));
    } finally {
      setIsSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-sm text-gray-500">Loading companies...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-lg font-semibold text-red-600">{loadError.message}</p>
        <Button onClick={refreshCompanies} variant="primary">
          Retry
        </Button>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <EmptyState
        title="No companies found"
        description="No companies have been created yet."
        actionText="Create company"
        action={() => window.location.assign('/companies/create')}
      />
    );
  }

  // Block UI if no active company (tenant isolation)
  if (!activeCompany) {
    return (
      <EmptyState
        title="No active company"
        description="Select or create a company to manage details."
        actionText="Select company"
        action={() => window.location.assign('/companies')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner message="You have read-only access. Editing is disabled." />
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Company Details</p>
          <h1 className="text-3xl font-bold text-gray-900">{activeCompany?.name}</h1>
          <p className="text-sm text-gray-500">
            {activeCompany?.city}, {activeCompany?.country} • {activeCompany?.postalCode}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={refreshCompanies} size="small">
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit profile</h2>
            <p className="text-sm text-gray-500">
              Update the base company information for your active entity.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            ID #{activeCompany?.id}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-gray-600">
              <span>Name</span>
              <PermissionGuard action="edit" role={user?.role} showDisabled>
                <input
                  name="name"
                  value={formState.name}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name"
                />
              </PermissionGuard>
            </label>

            <label className="space-y-2 text-sm text-gray-600">
              <span>Address</span>
              <PermissionGuard action="edit" role={user?.role} showDisabled>
                <input
                  name="address"
                  value={formState.address}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street address"
                />
              </PermissionGuard>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm text-gray-600">
              <span>City</span>
              <PermissionGuard action="edit" role={user?.role} showDisabled>
                <input
                  name="city"
                  value={formState.city}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </PermissionGuard>
            </label>
            <label className="space-y-2 text-sm text-gray-600">
              <span>Postal Code</span>
              <PermissionGuard action="edit" role={user?.role} showDisabled>
                <input
                  name="postalCode"
                  value={formState.postalCode}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ZIP / Postal code"
                />
              </PermissionGuard>
            </label>
            <label className="space-y-2 text-sm text-gray-600">
              <span>Country</span>
              <PermissionGuard action="edit" role={user?.role} showDisabled>
                <input
                  name="country"
                  value={formState.country}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Country"
                />
              </PermissionGuard>
            </label>
          </div>

          {saveError && (
            <p className="text-sm text-red-600">{saveError.message}</p>
          )}

          {successMessage && (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <PermissionGuard action="edit" role={user?.role} showDisabled>
              <Button
                type="submit"
                variant="primary"
                loading={isSaving}
              >
                Save changes
              </Button>
            </PermissionGuard>
            <PermissionGuard action="edit" role={user?.role} showDisabled>
              <Button
                type="button"
                variant="outline"
                onClick={() => refreshCompanies()}
              >
                Reset
              </Button>
            </PermissionGuard>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Companies;
