import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import PermissionGuard from '../components/PermissionGuard';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole } from '../lib/permissions';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { companiesAPI } from '../services/companiesAPI';
import { formatApiError } from '../services/api';

export default function Companies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCompany, companies, setCompanies, switchCompany } = useCompany();
  const [loadError, setLoadError] = useState(null);
  const [formState, setFormState] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const hasLoadedRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const normalizeCompanies = (data) =>
    Array.isArray(data) ? data : data?.companies ? data.companies : [];

  const applyCompanies = useCallback(
    (list) => {
      setCompanies(list);
    },
    [setCompanies],
  );

  const loadCompanies = useCallback(
    async ({ force = false } = {}) => {
      const maxRetries = 2;
      let attempt = 0;

      setCompanies(null);
      setLoadError(null);

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      const run = async () => {
        try {
          const data = await companiesAPI.list({ force: force || attempt > 0 });
          if (!isMountedRef.current) {
            return;
          }
          const list = normalizeCompanies(data);
          applyCompanies(list);
        } catch (err) {
          if (!isMountedRef.current) {
            return;
          }
          const status = err?.response?.status || err?.status;
          if (status === 429 && attempt < maxRetries) {
            const delayMs = 500 * Math.pow(2, attempt);
            attempt += 1;
            retryTimeoutRef.current = setTimeout(run, delayMs);
            return;
          }
          setLoadError(formatApiError(err, 'Unable to load companies.'));
        }
      };

      run();
    },
    [applyCompanies, setCompanies],
  );

  const refreshCompanies = useCallback(() => {
    loadCompanies({ force: true });
  }, [loadCompanies]);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (!activeCompany) {
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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!activeCompany?.id) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage('');

    try {
      const payload = {
        name: formState.name?.trim() || '',
        address: formState.address?.trim() || '',
        city: formState.city?.trim() || '',
        postalCode: formState.postalCode?.trim() || '',
        country: formState.country?.trim() || '',
      };
      const updated = await companiesAPI.update(activeCompany.id, payload);
      const nextCompany = updated || { ...activeCompany, ...payload };

      setCompanies((prev) =>
        Array.isArray(prev)
          ? prev.map((company) =>
              String(company.id) === String(nextCompany.id) ? nextCompany : company,
            )
          : prev,
      );
      switchCompany(nextCompany, { reset: false });
      setSuccessMessage('Company details updated.');
    } catch (err) {
      setSaveError(formatApiError(err, 'Unable to save company details.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (companies === null) {
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
        title="No companies yet"
        description="Companies represent your business entities. To get started, request your admin or support to add a company."
        action={
          <Button
            variant="primary"
            disabled
            title="Only admins/support can add companies."
            className="cursor-not-allowed"
          >
            Request company
          </Button>
        }
        help="Once a company is added, you can manage its details and users here."
      />
    );
  }

  // Block UI if no active company (tenant isolation)
  if (!activeCompany) {
    return (
      <EmptyState
        title="No active company"
        description="Select or create a company to manage details."
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
      <Breadcrumbs items={[{ label: 'Home', to: '/dashboard' }, { label: 'Companies' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <p className="text-sm text-gray-500">
          Manage your business entities and their core details.
        </p>
      </div>
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner message="You have read-only access. Editing is disabled." />
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Company Details
          </p>
          <h2 className="text-xl font-bold text-gray-900">{activeCompany?.name}</h2>
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
          {saveError && <p className="text-sm text-red-600">{saveError.message}</p>}
          {successMessage && <p className="text-sm text-emerald-600">{successMessage}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <PermissionGuard action="edit" role={user?.role} showDisabled>
              <Button type="submit" variant="primary" loading={isSaving}>
                Save changes
              </Button>
            </PermissionGuard>
            <PermissionGuard action="edit" role={user?.role} showDisabled>
              <Button type="button" variant="outline" onClick={() => refreshCompanies()}>
                Reset
              </Button>
            </PermissionGuard>
          </div>
        </form>
      </Card>
    </div>
  );
}
