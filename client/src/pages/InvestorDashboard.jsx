
import React from 'react';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import ComplianceSnapshot from '../components/ComplianceSnapshot';

export default function InvestorDashboard() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <ReadOnlyBanner message="Investor accounts are read-only. You can view all data, but cannot make changes." />
      <h1 className="text-3xl font-bold mb-4">Investor Dashboard <span className="text-base font-normal text-blue-700 align-middle ml-2">(Read-Only)</span></h1>
      <div className="mb-6">
        <p className="text-blue-900 bg-blue-50 border border-blue-200 rounded px-4 py-2 text-center">
          Investor accounts are <strong>read-only</strong>. You can review compliance, audit, and AI insights, but cannot create, edit, or delete any data.
        </p>
      </div>
      <ComplianceSnapshot />
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Compliance Status Overview</h2>
        <p className="text-gray-700 mb-4">High-level compliance and trust snapshot for investors. All data is read-only.</p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Audit Log Summary</h2>
        <p className="text-gray-700 mb-4">Summary of audit logs relevant to investors. No actions can be performed in this mode.</p>
        {/* No mutating actions or buttons for investors */}
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">GDPR Activity Summary</h2>
        <p className="text-gray-700 mb-4">Overview of GDPR-related activities. All data is read-only.</p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">AI Insights (Read-Only)</h2>
        <p className="text-gray-700 mb-4">AI-generated insights for investors. No data is changed or generated in this mode.</p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Explain This System</h2>
        <p className="text-gray-700">This system is designed for compliance, transparency, and trust. In Investor Mode, you can review all relevant data without risk of modification. All actions are logged and visible for full traceability.</p>
      </section>
    </div>
  );
}
