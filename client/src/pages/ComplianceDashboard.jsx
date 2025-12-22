import React from 'react';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

// Placeholder for future API integration
export default function ComplianceDashboard() {
  const { user } = useAuth();
  // TODO: Wire to backend compliance endpoints if available
  // For now, static read-only compliance status
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner mode={readOnlyBannerMode(user?.role)} message="You have read-only access. Compliance actions are disabled." />
      )}
      <h1 className="text-3xl font-bold mb-4">Compliance Dashboard</h1>
      <p className="mb-6 text-gray-600">
        This dashboard provides an overview of your organization&apos;s compliance status for GDPR, GoBD, and VAT. For legal details, consult your compliance officer.
      </p>
      <div className="bg-white rounded shadow p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-2">GDPR Status</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>Data subject rights: enabled</li>
            <li>Export/anonymize: available</li>
            <li>Retention policy: enforced</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">GoBD Audit Readiness</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>Audit log: active</li>
            <li>Data immutability: enforced</li>
            <li>Access controls: role-based</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">VAT Compliance</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>VAT calculation: automated</li>
            <li>Reverse charge: supported</li>
            <li>Export for tax authorities: available</li>
          </ul>
        </section>
      </div>
      {isReadOnlyRole(user?.role) && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 mt-4">
          You do not have permission to perform compliance actions.
        </div>
      )}
    </div>
  );
}
