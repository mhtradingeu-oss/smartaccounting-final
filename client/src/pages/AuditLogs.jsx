import React, { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

import { auditLogsAPI } from '../services/auditLogsAPI';
import { useAuth } from '../context/AuthContext';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { isReadOnlyRole } from '../lib/permissions';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    auditLogsAPI
      .list()
      .then((data) => {
        if (mounted) {
          setLogs(data);
        }
      })
      .catch((err) => setError(err?.message || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner message="You have read-only access. Audit exports are view-only." />
      )}
      <h1 className="text-3xl font-bold mb-4">Audit Logs</h1>
      <p className="mb-6 text-gray-600">
        This feed mirrors the `/api/exports/audit-logs?format=json` endpoint so auditors can review
        the same GoBD-grade trail exported for legal reviews. Entries below reflect company-scoped
        activity only.
      </p>
      <div className="bg-white rounded shadow p-6">
        {loading ? (
          <LoadingState message="Loading audit trail export..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : logs.length === 0 ? (
          <EmptyState title="Export is empty" description="No audit entries were exported yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Actor
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Action
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Target
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{log.actor || '-'}</td>
                    <td className="px-4 py-2 text-gray-700">{log.action}</td>
                    <td className="px-4 py-2 text-gray-700">{log.target || '-'}</td>
                    <td className="px-4 py-2 text-gray-700">{log.reason || '-'}</td>
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
