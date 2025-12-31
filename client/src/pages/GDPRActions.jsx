import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDangerModal } from '../components/ui/ConfirmDangerModal';
import { gdprAPI } from '../services/gdprAPI';
import { useAuth } from '../context/AuthContext';

export default function GDPRActions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // 'export' | 'anonymize' | null
  const [result, setResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setExporting(true);
    try {
      const data = await gdprAPI.exportUser(user.id);
      setResult({ type: 'export', data });
    } catch (err) {
      setError(err?.message || 'Failed to export data');
    } finally {
      setLoading(false);
      setExporting(false);
      setModal(null);
    }
  };

  const handleAnonymize = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnonymizing(true);
    try {
      await gdprAPI.anonymizeUser(user.id, 'Requested via GDPR Actions UI');
      setResult({ type: 'anonymize', data: 'User anonymized successfully.' });
    } catch (err) {
      setError(err?.message || 'Failed to anonymize user');
    } finally {
      setLoading(false);
      setAnonymizing(false);
      setModal(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">GDPR Actions</h1>
      <p className="mb-6 text-gray-600">
        Under the GDPR, you have the right to export your data and request anonymization. Anonymization is <span className="font-semibold text-red-600">irreversible</span> and will remove all personal identifiers. Only admins can anonymize users.
      </p>
      <div className="bg-white rounded shadow p-6 space-y-6">
          {error && (
            <Card className="my-8">
              <div className="flex flex-col items-center">
                <span className="text-red-600 font-semibold mb-2">{error}</span>
                <Button variant="outline" onClick={() => setError(null)}>Retry</Button>
              </div>
            </Card>
          )}
        {result && (
          <div className="p-4 bg-green-50 text-green-700 rounded">
            {result.type === 'export' ? (
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(result.data, null, 2)}</pre>
            ) : (
              <span>{result.data}</span>
            )}
          </div>
        )}
        <div className="flex gap-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
            onClick={() => setModal('export')}
            disabled={loading}
          >
            Export My Data
          </button>
          {user?.role === 'admin' && (
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none"
              onClick={() => setModal('anonymize')}
              disabled={loading}
            >
              Anonymize My Account
            </button>
          )}
        </div>
        {modal === 'export' && (
            <ConfirmDangerModal
              open={true}
              title="Export Data"
              description="Are you sure you want to export all user data? This may take a while."
              confirmText="Export"
              loading={exporting}
              onConfirm={handleExport}
              onClose={() => setModal(null)}
            />
        )}
        {modal === 'anonymize' && (
            <ConfirmDangerModal
              open={true}
              title="Anonymize Data"
              description="Are you sure you want to anonymize all user data? This action cannot be undone."
              confirmText="Anonymize"
              loading={anonymizing}
              onConfirm={handleAnonymize}
              onClose={() => setModal(null)}
            />
        )}
      </div>
    </div>
  );
}
