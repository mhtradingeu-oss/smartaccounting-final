import React, { useEffect, useState } from 'react';
import { usersAPI } from '../services/usersAPI';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
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
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    usersAPI
      .list()
      .then((data) => {
        if (mounted) {
          setUsers(data);
        }
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load users');
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setUpdating((prev) => ({ ...prev, [userId]: true }));
    try {
      // Only allow role change if not self and current user is admin
      if (currentUser?.role !== 'admin' || currentUser?.id === userId) {return;}
      await usersAPI.update(userId, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (err) {
      setError(err?.message || 'Failed to update role');
    } finally {
      setUpdating((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Role-Based Access Control (RBAC)</h1>
      <p className="mb-6 text-gray-600">Manage users, roles, and permissions for your organization. Only admins can access this page.</p>
      <div className="bg-white rounded shadow p-6">
        <div className="mb-4 flex justify-between items-center">
          <span className="font-semibold">Users & Roles</span>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none" disabled>
            Invite User (Coming Soon)
          </button>
        </div>
        {loading ? (
          <LoadingState message="Loading users..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="No users are registered for this organization." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-2"></th>
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
        )}
      </div>
    </div>
  );
}
