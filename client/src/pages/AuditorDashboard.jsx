import React from 'react';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import ComplianceSnapshot from '../components/ComplianceSnapshot';

const AuditorDashboard = () => {
  return (
    <div className="p-6">
      <ReadOnlyBanner mode="Auditor" />
      <h1 className="text-3xl font-bold mb-4">Auditor Mode — Read-Only</h1>
      <ComplianceSnapshot />
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Audit Log Summary</h2>
        <p className="text-gray-700 mb-4">Review a summary of all system audit logs. No actions can be performed in this mode.</p>
        {/* TODO: Add audit log summary table or component here */}
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">GDPR Activity Summary</h2>
        <p className="text-gray-700 mb-4">Overview of GDPR-related activities and requests. All data is read-only.</p>
        {/* TODO: Add GDPR summary component here */}
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">AI Insights (Read-Only)</h2>
        <p className="text-gray-700 mb-4">AI-generated insights for auditors. No data is changed or generated in this mode.</p>
        {/* TODO: Add AI insights summary here */}
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Explain This System</h2>
        <p className="text-gray-700">This system is designed for compliance, transparency, and auditability. In Auditor Mode, you can review all relevant data without risk of modification. All actions are logged and visible for full traceability.</p>
      </section>
    </div>
  );
};

export default AuditorDashboard;
