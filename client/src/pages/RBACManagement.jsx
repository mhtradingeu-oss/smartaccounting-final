import React, { useEffect, useState, useCallback, useRef } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';
import { usersAPI } from '../services/usersAPI';
import { formatApiError } from '../services/api';
import { PageLoadingState, PageEmptyState, PageErrorState } from '../components/ui/PageStates';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  admin: 'Admin',
  user: 'User',
  accountant: 'Accountant',
  auditor: 'Auditor',
};

export default function RBACManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updating, setUpdating] = useState({});
  const isMountedRef = useRef(true);

  const fetchUsers = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }
    setLoading(true);
    setError(null);
    setUsers([]);
    try {
      const data = await usersAPI.list();
      if (!isMountedRef.current) {
        return;
      }
      setUsers(Array.isArray(data) ? data : []);
      setActionError(null);
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      setError(formatApiError(err, 'Unable to load users.'));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    setActionError(null);
    setUpdating((prev) => ({ ...prev, [userId]: true }));
    try {
      // Only allow role change if not self and current user is admin
      if (currentUser?.role !== 'admin' || currentUser?.id === userId) {
        return;
      }
      await usersAPI.update(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setActionError(formatApiError(err, 'Unable to change role.'));
    } finally {
      setUpdating((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Breadcrumbs items={[{ label: 'Home', to: '/dashboard' }, { label: 'RBAC' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">RBAC</h1>
        <p className="text-sm text-gray-500">
          Manage user roles and permissions for your organization. Only admins can access this page.
        </p>
      </div>
      <div className="bg-white rounded shadow p-6">
        <div className="mb-4 flex justify-between items-center">
          <span className="font-semibold">Users & Roles</span>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
            disabled
            title="User invitations are coming soon."
          >
            Invite User (Coming Soon)
          </button>
        </div>
        {loading ? (
          <PageLoadingState title="Loading users..." description="Fetching role assignments." />
        ) : error ? (
          <PageErrorState message={error?.message} onRetry={fetchUsers} />
        ) : users.length === 0 ? (
          <PageEmptyState
            title="No users yet"
            description="No users are registered for this organization. Only admins can add users."
            help="Once users are added, you can assign and update their roles here."
          />
        ) : (
          <>
            {actionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">
                {actionError.message}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      Role
                    </th>
                    <th scope="col" className="px-4 py-2" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className={u.id === currentUser?.id ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-2 font-medium text-gray-900">{u.name || u.email}</td>
                      <td className="px-4 py-2 text-gray-700">{u.email}</td>
                      <td className="px-4 py-2">
                        {currentUser?.role === 'admin' && u.id !== currentUser?.id ? (
                          <select
                            className="border rounded px-2 py-1"
                            value={u.role}
                            disabled={updating[u.id]}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          >
                            {Object.entries(ROLE_LABELS).map(([role, label]) => (
                              <option key={role} value={role}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {updating[u.id] && (
                          <span className="text-xs text-blue-500">Updating...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
