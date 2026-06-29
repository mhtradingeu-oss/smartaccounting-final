import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { formatApiError, SKIP_FORCE_LOGOUT_ON_401_FLAG } from '../services/api';
import api from '../services/api';

const formatDateTime = (value) => {
  if (!value) {return 'Not available';}
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {return 'Not available';}
  return date.toLocaleString();
};

const ProfileSettings = () => {
  const { user, logout, refreshUser } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  const visibleSessions = useMemo(() => sessions.slice(0, 10), [sessions]);

  useEffect(() => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    });
  }, [user]);

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const response = await api.get('/auth/sessions', {
        [SKIP_FORCE_LOGOUT_ON_401_FLAG]: true,
      });
      setSessions(response.data?.sessions || []);
    } catch (err) {
      setSessionsError(formatApiError(err, 'Unable to load active sessions.').message);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleEdit = () => {
    setSuccess(null);
    setError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setSuccess(null);
    setError(null);
    setEditing(false);
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put('/auth/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setForm({
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || '',
        });
      }

      await refreshUser?.();
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      setError(formatApiError(err, 'Unable to update profile.').message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setSuccess(null);

    try {
      await api.post('/auth/change-password', passwordForm, {
        [SKIP_FORCE_LOGOUT_ON_401_FLAG]: true,
      });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setSuccess('Password changed successfully.');
    } catch (err) {
      setPasswordError(formatApiError(err, 'Unable to change password.').message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await api.delete(`/auth/sessions/${id}`, {
        [SKIP_FORCE_LOGOUT_ON_401_FLAG]: true,
      });
      setSessions((prev) => prev.filter((session) => session.id !== id));
    } catch (err) {
      setSessionsError(formatApiError(err, 'Unable to revoke session.').message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
          Account Center
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Manage your personal identity, password, and active sessions. Company legal details are managed separately from the Companies page.
        </p>
      </div>

      {success && !editing && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </div>
      )}

      <Card className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personal profile</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This name appears in the sidebar, audit trail, and internal user management.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            editing
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {editing ? 'Editing enabled' : 'Read-only until you click Edit'}
          </span>
        </div>

        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>First name</span>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                disabled={!editing}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-900"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <span>Last name</span>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                disabled={!editing}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-900"
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Email</span>
            <input
              name="email"
              value={form.email}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 p-3 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            />
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Email changes are disabled for security and audit consistency.
            </span>
          </label>

          {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}

          <div className="flex flex-wrap gap-3">
            {editing ? (
              <>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleEdit}>
                Edit personal profile
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-5 p-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Change password</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Enter your current password and a new password with at least 8 characters. A wrong current password will show a validation message and will not log you out.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleChangePassword}>
          <label className="block space-y-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Current password</span>
            <input
              name="currentPassword"
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>New password</span>
            <input
              name="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Show passwords
          </label>

          {passwordError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {passwordError}
            </div>
          )}

          <Button
            type="submit"
            disabled={
              passwordSaving || !passwordForm.currentPassword || passwordForm.newPassword.length < 8
            }
          >
            {passwordSaving ? 'Changing...' : 'Change password'}
          </Button>
        </form>
      </Card>

      <Card className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active sessions</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review recent login sessions and revoke older tokens you no longer need. Showing the latest 10 sessions.
            </p>
          </div>
          <Button type="button" variant="secondary" size="small" onClick={loadSessions}>
            Refresh
          </Button>
        </div>

        {sessionsLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</div>
        ) : sessionsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {sessionsError}
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No active sessions found.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {visibleSessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Session #{session.id}
                    {session.current && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {formatDateTime(session.createdAt)} · Expires: {formatDateTime(session.expiresAt)}
                  </div>
                </div>
                {!session.current && (
                  <Button size="small" variant="outline" onClick={() => handleRevokeSession(session.id)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Logout</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          End your current session on this browser.
        </p>
        <Button variant="danger" onClick={logout}>
          Logout
        </Button>
      </Card>
    </div>
  );
};

export default ProfileSettings;
