import React from 'react';

const ComplianceSnapshot = () => {
  // Placeholder data — replace with real data sources as needed
  const compliance = {
    status: 'Compliant',
    lastAudit: '2025-11-30',
    auditScore: 98,
    gdprStatus: 'All requests handled',
    auditLogEntries: 1245,
    aiSummary: 'No anomalies detected',
  };

  return (
    <div className="bg-white border rounded shadow p-4 mb-8">
      <h2 className="text-xl font-semibold mb-2">Compliance Status Overview</h2>
      <ul className="text-gray-700">
        <li><strong>Status:</strong> {compliance.status}</li>
        <li><strong>Last Audit:</strong> {compliance.lastAudit}</li>
        <li><strong>Audit Score:</strong> {compliance.auditScore}%</li>
        <li><strong>GDPR:</strong> {compliance.gdprStatus}</li>
        <li><strong>Audit Log Entries:</strong> {compliance.auditLogEntries}</li>
        <li><strong>AI Insights:</strong> {compliance.aiSummary}</li>
      </ul>
    </div>
  );
};

export default ComplianceSnapshot;
