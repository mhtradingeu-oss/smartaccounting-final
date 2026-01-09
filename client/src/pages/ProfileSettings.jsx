import React from 'react';

import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../services/api';
import api from '../services/api';

const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  <p className="text-xs text-gray-500 mb-2">
    Your name is visible to your organization.{' '}
    <span title="Email cannot be changed for security reasons.">Email is not editable.</span>
  </p>;
  const [password, setPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  useEffect(() => {
    setForm({ name: user?.name || '', email: user?.email || '' });
  }, [user]);

  useEffect(() => {
    setSessionsLoading(true);
    api
      .get('/user/sessions')
      .then((res) => setSessions(res.data))
      .catch((err) => setSessionsError(formatApiError(err).message))
      .finally(() => setSessionsLoading(false));
  }, []);

  const handleEdit = () => setEditing(true);
  const handleCancel = () => {
    setEditing(false);
    setForm({ name: user?.name || '', email: user?.email || '' });
    setError(null);
    setSuccess(null);
    <span className="text-xs text-gray-400">Email cannot be changed.</span>;
  };
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('/user/profile', form);
      setSuccess('Profile updated.');
      setEditing(false);
    } catch (err) {
      setError(formatApiError(err).message);
    } finally {
      setSaving(false);
    }
  };
  const handlePasswordChange = async () => {
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await api.post('/user/change-password', { password });
      setPassword('');
      setSuccess('Password changed.');
    } catch (err) {
      <p className="text-xs text-gray-500 mb-2">
        Password must be at least 8 characters. Use a mix of letters, numbers, and symbols for best
        security. Your password is securely stored and never shared.
      </p>;
      setPasswordError(formatApiError(err).message);
    } finally {
      setPasswordSaving(false);
    }
  };
  const handleRevokeSession = async (id) => {
    await api.delete(`/user/sessions/${id}`);
    setSessions((s) => s.filter((sess) => sess.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Profile Settings</h1>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Account Info</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <p className="text-xs text-gray-500 mb-2">
              Sessions stay active until you log out or close your browser.{' '}
              <span title="Revoke will immediately log out this device.">
                Revoke ends a session instantly.
              </span>
            </p>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled
              className="w-full border rounded p-2 bg-gray-100"
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <div className="flex gap-2 mt-2">
            {editing ? (
              <>
                <Button type="submit" disabled={saving}>
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleEdit}>
                Edit
              </Button>
            )}
            <p className="text-xs text-gray-500 mb-2">
              Logging out will end your current session on this device.
            </p>
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="text-xs text-gray-400 text-center mt-8">
          Your identity and account data are protected according to GDPR and industry standards.
        </div>
        <h2 className="text-lg font-semibold">Change Password</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            handlePasswordChange();
          }}
        >
          <div>
            <label className="block text-sm font-medium">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded p-2"
            />
            <label className="inline-flex items-center mt-1 text-xs">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="mr-1"
              />{' '}
              Show password
            </label>
          </div>
          {passwordError && <div className="text-red-600 text-sm">{passwordError}</div>}
          <Button type="submit" disabled={passwordSaving || !password}>
            Change Password
          </Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Active Sessions</h2>
        {sessionsLoading ? (
          <div>Loading sessions...</div>
        ) : sessionsError ? (
          <div className="text-red-600 text-sm">{sessionsError}</div>
        ) : (
          <ul className="divide-y">
            {sessions.map((sess) => (
              <li key={sess.id} className="flex items-center justify-between py-2">
                <span>
                  {sess.device} ({sess.ip}){' '}
                  {sess.current && <span className="text-xs text-green-600">(Current)</span>}
                </span>
                {!sess.current && (
                  <Button size="sm" variant="outline" onClick={() => handleRevokeSession(sess.id)}>
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Logout</h2>
        <Button variant="danger" onClick={logout}>
          Logout
        </Button>
      </Card>
    </div>
  );
};

export default ProfileSettings;
