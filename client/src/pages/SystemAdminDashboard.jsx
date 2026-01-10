import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { Label } from '../components/ui/Label';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatApiError } from '../services/api';
import { systemAdminAPI } from '../services/systemAdminAPI';
import { USER_ROLES } from '../lib/constants';

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
};

const defaultCompanyForm = {
  name: '',
  taxId: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  ownerUserId: '',
};

const defaultUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: USER_ROLES.ADMIN,
  companyId: '',
};

const Field = ({ label, children }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);

const SystemAdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [featureFlags, setFeatureFlags] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [backups, setBackups] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [config, setConfig] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [maintenanceReason, setMaintenanceReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewData,
        companyData,
        userData,
        planData,
        subscriptionData,
        flagData,
        logData,
        backupData,
        maintenanceData,
        configData,
        monitoringData,
      ] = await Promise.all([
        systemAdminAPI.getOverview(),
        systemAdminAPI.listCompanies(),
        systemAdminAPI.listUsers(),
        systemAdminAPI.getPlans(),
        systemAdminAPI.getSubscriptions(),
        systemAdminAPI.getFeatureFlags(),
        systemAdminAPI.getAuditLogs(40),
        systemAdminAPI.getBackups(),
        systemAdminAPI.getMaintenance(),
        systemAdminAPI.getConfig(),
        systemAdminAPI.getMonitoring(),
      ]);

      setOverview(overviewData);
      setCompanies(companyData);
      setUsers(userData);
      setPlans(planData);
      setSubscriptions(subscriptionData);
      setFeatureFlags(flagData);
      setAuditLogs(logData);
      setBackups(backupData);
      setMaintenance(maintenanceData);
      setConfig(configData);
      setMonitoring(monitoringData);
    } catch (err) {
      setError(formatApiError(err, 'Unable to load system admin dashboard.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshCompanies = async () => {
    try {
      const data = await systemAdminAPI.listCompanies();
      setCompanies(data);
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to refresh companies.'));
    }
  };

  const refreshUsers = async () => {
    try {
      const data = await systemAdminAPI.listUsers();
      setUsers(data);
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to refresh users.'));
    }
  };

  const handleCompanyFormChange = (field, value) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserFormChange = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCompany = async () => {
    setActionError(null);
    try {
      const payload = {
        ...companyForm,
        ownerUserId: companyForm.ownerUserId || null,
      };
      await systemAdminAPI.createCompany(payload);
      setCompanyForm(defaultCompanyForm);
      await refreshCompanies();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to create company.'));
    }
  };

  const handleSuspendCompany = async (companyId) => {
    setActionError(null);
    try {
      await systemAdminAPI.suspendCompany(companyId, {});
      await refreshCompanies();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to suspend company.'));
    }
  };

  const handleRestoreCompany = async (companyId) => {
    setActionError(null);
    try {
      await systemAdminAPI.restoreCompany(companyId);
      await refreshCompanies();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to restore company.'));
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm('Delete this company? This cannot be undone.')) {
      return;
    }
    setActionError(null);
    try {
      await systemAdminAPI.deleteCompany(companyId);
      await refreshCompanies();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to delete company.'));
    }
  };

  const handleToggleCompanyFlag = async (company, key) => {
    setActionError(null);
    try {
      await systemAdminAPI.updateCompanyFlags(company.id, {
        [key]: !company[key],
      });
      await refreshCompanies();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to update company flags.'));
    }
  };

  const handleCreateUser = async () => {
    setActionError(null);
    try {
      const payload = {
        ...userForm,
        companyId: userForm.companyId || null,
      };
      await systemAdminAPI.createUser(payload);
      setUserForm(defaultUserForm);
      await refreshUsers();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to create user.'));
    }
  };

  const handleUserRoleChange = async (userId, role) => {
    setActionError(null);
    try {
      await systemAdminAPI.updateUser(userId, { role });
      await refreshUsers();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to update user role.'));
    }
  };

  const handleUserStatusToggle = async (user) => {
    setActionError(null);
    try {
      await systemAdminAPI.updateUser(user.id, { isActive: !user.isActive });
      await refreshUsers();
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to update user status.'));
    }
  };

  const handleMaintenanceToggle = async () => {
    setActionError(null);
    try {
      const nextEnabled = !maintenance?.enabled;
      const updated = await systemAdminAPI.setMaintenance({
        enabled: nextEnabled,
        reason: nextEnabled ? maintenanceReason : '',
      });
      setMaintenance(updated);
      setMaintenanceReason('');
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to update maintenance mode.'));
    }
  };

  const companyOptions = useMemo(
    () =>
      companies.map((company) => ({
        label: company.name,
        value: String(company.id),
      })),
    [companies],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <LoadingSpinner size="large" />
        <p className="text-sm text-gray-500">Loading system dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-lg font-semibold text-red-600">{error.message}</p>
        {error.retryable && (
          <Button onClick={loadData} variant="primary">
            Retry
          </Button>
        )}
      </div>
    );
  }

  const maintenanceBadge = maintenance?.enabled ? (
    <Badge color="red">Active</Badge>
  ) : (
    <Badge color="green">Normal</Badge>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">System Admin Dashboard</h1>
        <p className="text-sm text-gray-500">
          Platform oversight, tenant management, billing visibility, and governance controls.
        </p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError.message}
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Overview</h2>
              <p className="text-sm text-gray-500">Health, uptime, and platform totals.</p>
            </div>
            <Button variant="secondary" size="small" onClick={loadData}>
              Refresh
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Version</p>
              <p className="text-sm font-semibold text-gray-900">
                {overview?.version || '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Uptime</p>
              <p className="text-sm font-semibold text-gray-900">
                {overview?.uptime ? `${Math.floor(overview.uptime)}s` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Companies</p>
              <p className="text-sm font-semibold text-gray-900">
                {overview?.counts?.companies ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs uppercase text-gray-500">Users</p>
              <p className="text-sm font-semibold text-gray-900">
                {overview?.counts?.users ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Companies Management</h2>
              <p className="text-sm text-gray-500">Create, suspend, and govern tenant accounts.</p>
            </div>
            <Button variant="secondary" size="small" onClick={refreshCompanies}>
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Company name">
              <Input
                value={companyForm.name}
                onChange={(event) => handleCompanyFormChange('name', event.target.value)}
              />
            </Field>
            <Field label="Tax ID">
              <Input
                value={companyForm.taxId}
                onChange={(event) => handleCompanyFormChange('taxId', event.target.value)}
              />
            </Field>
            <Field label="City">
              <Input
                value={companyForm.city}
                onChange={(event) => handleCompanyFormChange('city', event.target.value)}
              />
            </Field>
            <Field label="Address">
              <Input
                value={companyForm.address}
                onChange={(event) => handleCompanyFormChange('address', event.target.value)}
              />
            </Field>
            <Field label="Postal code">
              <Input
                value={companyForm.postalCode}
                onChange={(event) => handleCompanyFormChange('postalCode', event.target.value)}
              />
            </Field>
            <Field label="Country">
              <Input
                value={companyForm.country}
                onChange={(event) => handleCompanyFormChange('country', event.target.value)}
              />
            </Field>
            <Field label="Owner user ID (optional)">
              <Input
                value={companyForm.ownerUserId}
                onChange={(event) => handleCompanyFormChange('ownerUserId', event.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button variant="primary" onClick={handleCreateCompany}>
                Create company
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Users
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    AI Flags
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{company.name}</div>
                      <div className="text-xs text-gray-500">{company.taxId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {company.isActive ? (
                        <Badge color="green">Active</Badge>
                      ) : (
                        <Badge color="red">Suspended</Badge>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {company.suspendedAt ? `Since ${formatDateTime(company.suspendedAt)}` : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {company.userCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleToggleCompanyFlag(company, 'aiEnabled')}
                        >
                          AI: {company.aiEnabled ? 'On' : 'Off'}
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleToggleCompanyFlag(company, 'ttsEnabled')}
                        >
                          Voice: {company.ttsEnabled ? 'On' : 'Off'}
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        {company.isActive ? (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleSuspendCompany(company.id)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleRestoreCompany(company.id)}
                          >
                            Restore
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDeleteCompany(company.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!companies.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                      No companies found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Users Management</h2>
              <p className="text-sm text-gray-500">Manage system and tenant users.</p>
            </div>
            <Button variant="secondary" size="small" onClick={refreshUsers}>
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field label="First name">
              <Input
                value={userForm.firstName}
                onChange={(event) => handleUserFormChange('firstName', event.target.value)}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={userForm.lastName}
                onChange={(event) => handleUserFormChange('lastName', event.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                value={userForm.email}
                onChange={(event) => handleUserFormChange('email', event.target.value)}
              />
            </Field>
            <Field label="Temporary password">
              <Input
                type="password"
                value={userForm.password}
                onChange={(event) => handleUserFormChange('password', event.target.value)}
              />
            </Field>
            <Field label="Role">
              <Select
                value={userForm.role}
                onChange={(event) => handleUserFormChange('role', event.target.value)}
              >
                {Object.values(USER_ROLES).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Company (optional)">
              <Select
                value={userForm.companyId}
                onChange={(event) => handleUserFormChange('companyId', event.target.value)}
              >
                <option value="">System user (no company)</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button variant="primary" onClick={handleCreateUser}>
                Create user
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Select
                        value={user.role}
                        onChange={(event) => handleUserRoleChange(user.id, event.target.value)}
                      >
                        {Object.values(USER_ROLES).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.company?.name || 'System'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.isActive ? <Badge color="green">Active</Badge> : <Badge color="red">Disabled</Badge>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleUserStatusToggle(user)}
                      >
                        {user.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Plans & Pricing</h2>
          <p className="text-sm text-gray-500 mb-4">Current plan catalog.</p>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id || plan.name} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{plan.name || plan.id}</div>
                  <div className="text-xs text-gray-500">
                    {plan.interval ? `Billed ${plan.interval}` : 'Custom billing'}
                  </div>
                </div>
                <Badge color="blue">{plan.price || plan.unit_amount || '—'}</Badge>
              </div>
            ))}
            {!plans.length && <p className="text-sm text-gray-500">No plans available.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Subscriptions & Billing</h2>
          <p className="text-sm text-gray-500 mb-4">Tenant subscription state.</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {subscriptions.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.subscriptionPlan || 'basic'} • {item.subscriptionStatus || 'inactive'}
                  </div>
                </div>
                <Badge color={item.subscriptionStatus === 'active' ? 'green' : 'gray'}>
                  {item.subscriptionStatus || 'inactive'}
                </Badge>
              </div>
            ))}
            {!subscriptions.length && <p className="text-sm text-gray-500">No subscriptions found.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Feature Flags & AI Governance</h2>
          <p className="text-sm text-gray-500 mb-4">Global flags and tenant AI usage.</p>
          <div className="space-y-2 text-sm text-gray-700">
            {featureFlags?.flags &&
              Object.entries(featureFlags.flags).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span>{key}</span>
                  <Badge color={value === 'true' ? 'green' : 'gray'}>
                    {value === 'true' ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              ))}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs uppercase text-gray-500">AI Tenant Coverage</p>
              <div className="text-sm text-gray-700 mt-1">
                {featureFlags?.companyAI?.aiEnabledCount ?? 0} /{' '}
                {featureFlags?.companyAI?.totalCompanies ?? 0} companies have AI enabled
              </div>
              <div className="text-sm text-gray-700">
                {featureFlags?.companyAI?.ttsEnabledCount ?? 0} /{' '}
                {featureFlags?.companyAI?.totalCompanies ?? 0} companies have voice enabled
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Maintenance Mode</h2>
          <p className="text-sm text-gray-500 mb-4">Pause tenant traffic for upgrades.</p>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {maintenanceBadge}
              <span className="text-sm text-gray-700">
                {maintenance?.enabled ? 'Maintenance active' : 'System normal'}
              </span>
            </div>
            <Button variant={maintenance?.enabled ? 'secondary' : 'danger'} onClick={handleMaintenanceToggle}>
              {maintenance?.enabled ? 'Disable maintenance' : 'Enable maintenance'}
            </Button>
          </div>
          {!maintenance?.enabled && (
            <Field label="Reason (optional)">
              <Textarea
                value={maintenanceReason}
                onChange={(event) => setMaintenanceReason(event.target.value)}
                placeholder="Scheduled maintenance window details"
              />
            </Field>
          )}
          {maintenance?.enabled && maintenance?.reason && (
            <p className="text-sm text-gray-600 mt-2">Reason: {maintenance.reason}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Audit Logs (System-wide)</h2>
          <p className="text-sm text-gray-500 mb-4">Most recent activity across tenants.</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="border-b border-gray-200 pb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{log.action}</span>
                  <span className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {log.resourceType} • {log.resourceId || '—'} • Company {log.companyId || '—'}
                </div>
              </div>
            ))}
            {!auditLogs.length && <p className="text-sm text-gray-500">No audit logs found.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Backups & Restore</h2>
          <p className="text-sm text-gray-500 mb-4">Latest backup health snapshot.</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div>
              <span className="font-medium">Backup count:</span> {backups?.count ?? 0}
            </div>
            <div>
              <span className="font-medium">Last backup:</span>{' '}
              {backups?.lastBackup ? formatDateTime(backups.lastBackup.modifiedAt) : '—'}
            </div>
            <div className="text-xs text-gray-500">
              Restore operations are managed by infrastructure runbooks.
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Environment & Config</h2>
          <p className="text-sm text-gray-500 mb-4">Read-only runtime snapshot.</p>
          <div className="space-y-2 text-sm text-gray-700">
            {config &&
              Object.entries(config).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span>{key}</span>
                  <span className="text-xs text-gray-500">{String(value)}</span>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Monitoring & Telemetry</h2>
          <p className="text-sm text-gray-500 mb-4">Operational metrics summary.</p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>Total requests</span>
              <span>{monitoring?.requests ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Error rate</span>
              <span>{monitoring?.errorRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg response</span>
              <span>{monitoring?.averageResponseTime ?? 0}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Uptime</span>
              <span>{monitoring?.uptime ? `${Math.floor(monitoring.uptime)}s` : '—'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SystemAdminDashboard;
