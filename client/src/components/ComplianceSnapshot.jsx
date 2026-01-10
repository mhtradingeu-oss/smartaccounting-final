import React, { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { auditLogsAPI } from '../services/auditLogsAPI';
import { aiInsightsAPI } from '../services/aiInsightsAPI';
import { useCompany } from '../context/CompanyContext';

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('de-DE');
};

const extractTimestamp = (entry = {}) =>
  entry.timestamp || entry.createdAt || entry.occurredAt || entry.date;

const ComplianceSnapshot = () => {
  const { activeCompany } = useCompany();
  const activeCompanyId = activeCompany?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const hasCompany = Boolean(activeCompanyId);
  const emptyList = useMemo(() => [], []);

  useEffect(() => {
    let cancelled = false;
    if (!activeCompanyId) {
      return () => {
        cancelled = true;
      };
    }

    Promise.resolve()
      .then(() => {
        if (cancelled) {
          return null;
        }
        setLoading(true);
        setError(null);
        return Promise.all([
          auditLogsAPI.list({ companyId: activeCompanyId }),
          aiInsightsAPI.list({ companyId: activeCompanyId }),
        ]);
      })
      .then((result) => {
        if (!result || cancelled) {
          return;
        }
        const [logs, aiData] = result;
        setAuditLogs(Array.isArray(logs) ? logs : []);
        setAiInsights(Array.isArray(aiData?.insights) ? aiData.insights : []);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setError('Unable to load compliance snapshot.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const displayAuditLogs = hasCompany ? auditLogs : emptyList;
  const displayAiInsights = hasCompany ? aiInsights : emptyList;
  const displayLoading = hasCompany ? loading : false;
  const displayError = hasCompany ? error : null;

  const lastAuditDate = useMemo(() => {
    if (!displayAuditLogs.length) {
      return null;
    }
    const latest = displayAuditLogs.reduce((currentLatest, entry) => {
      const timestamp = extractTimestamp(entry);
      if (!timestamp) {
        return currentLatest;
      }
      const value = new Date(timestamp).getTime();
      if (Number.isNaN(value)) {
        return currentLatest;
      }
      if (!currentLatest || value > currentLatest) {
        return value;
      }
      return currentLatest;
    }, null);
    return latest ? new Date(latest) : null;
  }, [displayAuditLogs]);

  const statusLabel = displayAuditLogs.length > 0 ? 'Active' : 'No activity';
  const gdprLabel = displayAuditLogs.length > 0 ? 'Activity tracked' : 'No activity yet';

  return (
    <div className="bg-white border rounded shadow p-4 mb-8">
      <h2 className="text-xl font-semibold mb-2">Compliance Status Overview</h2>
      {displayLoading ? (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <LoadingSpinner size="small" />
          Loading compliance snapshot…
        </div>
      ) : displayError ? (
        <div className="text-sm text-red-600">{displayError}</div>
      ) : (
        <ul className="text-gray-700">
          <li>
            <strong>Status:</strong> {statusLabel}
          </li>
          <li>
            <strong>Last Audit:</strong> {formatDate(lastAuditDate)}
          </li>
          <li>
            <strong>GDPR:</strong> {gdprLabel}
          </li>
          <li>
            <strong>Audit Log Entries:</strong> {displayAuditLogs.length.toLocaleString('de-DE')}
          </li>
          <li>
            <strong>AI Insights:</strong> {displayAiInsights.length.toLocaleString('de-DE')}
          </li>
        </ul>
      )}
    </div>
  );
};

export default ComplianceSnapshot;
