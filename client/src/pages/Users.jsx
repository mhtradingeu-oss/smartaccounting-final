import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { formatApiError } from '../services/api';
import { usersAPI } from '../services/usersAPI';
import { USER_ROLES } from '../lib/constants';


import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import PermissionGuard from '../components/PermissionGuard';
import { isReadOnlyRole } from '../lib/permissions';

const roleOptions = [
  USER_ROLES.ADMIN,
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.AUDITOR,
  USER_ROLES.VIEWER,
];

const Users = () => {
  const { activeCompany } = useCompany();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);

    try {
      const data = await usersAPI.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(formatApiError(err, 'Unable to load users.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeCompany) {
      fetchUsers();
    }
  }, [fetchUsers, activeCompany]);

  const handleRoleChange = async (userId, nextRole) => {
    if (!nextRole || updatingUserId === userId) {return;}

    setUpdatingUserId(userId);
    setActionError(null);

    try {
      await usersAPI.update(userId, { role: nextRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)),
      );
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to change role.'));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleActive = async (targetUser) => {
    if (updatingUserId === targetUser.id) {
      return;
    }

    setUpdatingUserId(targetUser.id);
    setActionError(null);

    try {
      await usersAPI.update(targetUser.id, {
        isActive: !targetUser.isActive,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, isActive: !u.isActive }
            : u,
        ),
      );
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to update user status.'));
    } finally {
      setUpdatingUserId(null);
    }
  };

  /* -------------------- UI STATES -------------------- */


  if (!activeCompany) {
    return (
      <EmptyState
        title="No active company"
        description="Select a company to view users."
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
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <LoadingSpinner size="large" />
        <p className="text-sm text-gray-500">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-lg font-semibold text-red-600">
          {error.message}
        </p>
        {error.retryable && (
          <Button onClick={fetchUsers} variant="primary">
            Retry
          </Button>
        )}
      </div>
    );
  }

  /* -------------------- MAIN VIEW -------------------- */

  return (
    <div className="space-y-6">
      {isReadOnlyRole(currentUser?.role) && (
        <ReadOnlyBanner message="You have read-only access. Editing is disabled." />
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            User Management
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Team Members
          </h1>
          <p className="text-sm text-gray-500">
            Company: {activeCompany.name}
          </p>
        </div>

        <Button variant="secondary" size="small" onClick={fetchUsers}>
          Refresh
        </Button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError.message}
        </div>
      )}

      {users.length === 0 ? (
      <EmptyState
        title="No users found"
        description="No users have been added to this company yet."
        action={
          <Button
            disabled
            title="User invitations will be handled via support soon."
            className="cursor-not-allowed"
          >
            Invite user
          </Button>
        }
      />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 text-sm font-medium">
                      {u.firstName} {u.lastName}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.email}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <PermissionGuard action="edit" role={currentUser?.role} showDisabled>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingUserId === u.id}
                          className="w-full rounded-md border px-2 py-1 text-sm"
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </PermissionGuard>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <PermissionGuard action="edit" role={currentUser?.role} showDisabled>
                        <Button
                          size="small"
                          variant={u.isActive ? 'outline' : 'primary'}
                          disabled={updatingUserId === u.id}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </PermissionGuard>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Users;
