import { useCallback, useEffect, useMemo, useState } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { usersAPI } from '../services/usersAPI';
import { formatApiError } from '../services/api';
import { PageLoadingState, PageEmptyState, PageErrorState } from '../components/ui/PageStates';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', help: 'Full company administration access.' },
  { value: 'accountant', label: 'Accountant', help: 'Can manage accounting records and workflows.' },
  { value: 'auditor', label: 'Auditor', help: 'Read-only audit and compliance access.' },
  { value: 'viewer', label: 'Viewer', help: 'Basic read-only access.' },
];

const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, {});

const formatName = (user) => {
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return name || user.name || user.email || 'Unknown user';
};

const roleBadgeClass = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    case 'accountant':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'auditor':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200';
    case 'viewer':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
  }
};

export default function RBACManagement() {
  const { user: currentUser } = useAuth();
  const { activeCompany } = useCompany();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const canEditRoles = currentUser?.role === 'admin' && Boolean(activeCompany);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.id === currentUser?.id) return -1;
        if (b.id === currentUser?.id) return 1;
        return formatName(a).localeCompare(formatName(b));
      }),
    [users, currentUser?.id],
  );

  const fetchUsers = useCallback(async () => {
    if (!activeCompany) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const data = await usersAPI.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatApiError(err, 'Unable to load role assignments.'));
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (targetUser, nextRole) => {
    if (!canEditRoles || !nextRole || updatingUserId === targetUser.id) {
      return;
    }

    if (targetUser.id === currentUser?.id) {
      setActionError({
        message: 'You cannot change your own role from this page.',
      });
      return;
    }

    setUpdatingUserId(targetUser.id);
    setActionError(null);

    try {
      await usersAPI.update(targetUser.id, { role: nextRole });
      setUsers((prev) =>
        prev.map((user) => (user.id === targetUser.id ? { ...user, role: nextRole } : user)),
      );
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to change role.'));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleActive = async (targetUser) => {
    if (!canEditRoles || updatingUserId === targetUser.id) {
      return;
    }

    if (targetUser.id === currentUser?.id) {
      setActionError({
        message: 'You cannot deactivate your own account.',
      });
      return;
    }

    setUpdatingUserId(targetUser.id);
    setActionError(null);

    try {
      await usersAPI.update(targetUser.id, { isActive: !targetUser.isActive });
      setUsers((prev) =>
        prev.map((user) =>
          user.id === targetUser.id ? { ...user, isActive: !user.isActive } : user,
        ),
      );
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to update user status.'));
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!activeCompany) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/dashboard' }, { label: 'RBAC' }]} />
        <PageEmptyState
          title="No active company"
          description="Select a company before managing roles and permissions."
          help="Role assignments are company-scoped for audit and compliance reasons."
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/dashboard' }, { label: 'RBAC' }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
            Administration
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage user roles and access for {activeCompany.name}. Only admins can edit role
            assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
          <Button size="small" disabled title="User invitations are coming soon.">
            Invite User (Coming Soon)
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Users & Roles
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sortedUsers.length} user{sortedUsers.length === 1 ? '' : 's'} connected to this
                company.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              {canEditRoles ? 'Admin editing enabled' : 'Read-only view'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <PageLoadingState title="Loading users..." description="Fetching role assignments." />
          </div>
        ) : error ? (
          <div className="p-6">
            <PageErrorState message={error?.message} onRetry={fetchUsers} />
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="p-6">
            <PageEmptyState
              title="No users yet"
              description="No users are registered for this organization."
              help="Once users are added, admins can assign and update their roles here."
            />
          </div>
        ) : (
          <>
            {actionError && (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {actionError.message}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
                  {sortedUsers.map((targetUser) => {
                    const isCurrentUser = targetUser.id === currentUser?.id;
                    const isUpdating = updatingUserId === targetUser.id;

                    return (
                      <tr
                        key={targetUser.id}
                        className={
                          isCurrentUser
                            ? 'bg-blue-50/70 dark:bg-blue-950/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-900/60'
                        }
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatName(targetUser)}
                            {isCurrentUser && (
                              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {targetUser.email}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {canEditRoles && !isCurrentUser ? (
                            <select
                              className="min-w-36 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                              value={targetUser.role}
                              disabled={isUpdating}
                              onChange={(event) => handleRoleChange(targetUser, event.target.value)}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(
                                targetUser.role,
                              )}`}
                            >
                              {ROLE_LABELS[targetUser.role] || targetUser.role}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              targetUser.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {targetUser.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isUpdating ? (
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                              Updating...
                            </span>
                          ) : (
                            <Button
                              size="small"
                              variant={targetUser.isActive ? 'outline' : 'primary'}
                              disabled={!canEditRoles || isCurrentUser}
                              onClick={() => handleToggleActive(targetUser)}
                              title={
                                isCurrentUser
                                  ? 'You cannot deactivate your own account.'
                                  : 'Toggle user status'
                              }
                            >
                              {targetUser.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
