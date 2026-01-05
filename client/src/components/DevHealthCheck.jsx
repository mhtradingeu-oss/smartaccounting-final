import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';

const HEALTH_PATH = '/health';
const READY_PATH = '/ready';

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  error: 'bg-rose-100 text-rose-800 border-rose-200',
};

const formatStatusLabel = (status) => {
  switch (status) {
    case 'ok':
      return 'Healthy';
    case 'error':
      return 'Unreachable';
    default:
      return 'Pending';
  }
};

const DevHealthCheck = () => {
  const isDev = import.meta.env.DEV;
  const { user } = useAuth();
  const envOverride = import.meta.env.VITE_API_URL?.trim();
  const displayBase = envOverride || API_BASE_URL;
  const fetchBase = useMemo(() => (API_BASE_URL || '/api').replace(/\/$/, ''), []);
  const [health, setHealth] = useState({ status: 'pending', message: 'awaiting check' });
  const [ready, setReady] = useState({ status: 'pending', message: 'awaiting check' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkEndpoint = useCallback(
    async (path, setter) => {
      const targetUrl = `${fetchBase}${path}`;
      try {
        const response = await fetch(targetUrl, { method: 'GET', credentials: 'include' });
        if (!response.ok) {
          setter({
            status: 'error',
            message: `HTTP ${response.status}`,
          });
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json().catch(() => null);
        setter({
          status: 'ok',
          message: data?.status || response.statusText || 'OK',
        });
      } catch (error) {
        setter({
          status: 'error',
          message: error?.message || 'Network failure',
        });
        setFetchError(error?.message || 'Unable to reach API');
        throw error;
    }
  },
  [fetchBase, setFetchError],
);

  const refresh = useCallback(async () => {
    setFetchError(null);
    setIsChecking(true);
    try {
      await Promise.all([
        checkEndpoint(HEALTH_PATH, setHealth),
        checkEndpoint(READY_PATH, setReady),
      ]);
      setLastUpdated(new Date());
    } catch (_err) {
      // errors already captured in state
    } finally {
      setIsChecking(false);
    }
  }, [checkEndpoint]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const userIdentity = user?.email || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Not signed in';

  if (!isDev) {
    return null;
  }

  return (
    <section className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm mb-6">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Frontend Health Check</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Visible only in development</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isChecking}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-blue-300 dark:text-blue-300 dark:hover:text-blue-400"
        >
          {isChecking ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="px-4 py-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <p>
          API base: <span className="font-mono text-xs">{displayBase}</span>{' '}
          <span className="text-gray-400 dark:text-gray-500">({envOverride ? 'VITE_API_URL' : 'fallback /api proxy'})</span>
        </p>
        <p>User identity: <span className="font-semibold text-gray-900 dark:text-gray-100">{userIdentity}</span></p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[{ label: '/health', state: health }, { label: '/ready', state: ready }].map((item) => (
            <div key={item.label} className={`border ${statusStyles[item.state.status]} px-3 py-2 rounded-lg flex flex-col`}>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-300">{item.label}</span>
              <span className="text-sm font-mono">{formatStatusLabel(item.state.status)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.state.message}</span>
            </div>
          ))}
        </div>
        {fetchError && (
          <div className="border border-rose-200 bg-rose-50 text-rose-800 rounded-md px-3 py-2 text-xs flex flex-col gap-1">
            <strong className="text-sm">API unreachable</strong>
            <span>
              Verify the backend is running at <span className="font-mono">{displayBase}</span>, adjust
              <span className="font-mono ml-1">VITE_API_URL</span>, or restart the backend/docker stack.
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Last refreshed:{' '}
          {lastUpdated ? lastUpdated.toLocaleTimeString() : 'awaiting first check'}
        </p>
      </div>
    </section>
  );
};

export default DevHealthCheck;
