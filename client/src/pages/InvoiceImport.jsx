import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { formatApiError } from '../services/api';
import { invoicesAPI } from '../services/invoicesAPI';
import { canEditInvoices, isReadOnlyRole, readOnlyBannerMode } from '../lib/rbac';

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'preview', label: 'Preview' },
  { id: 'result', label: 'Result' },
];

const InvoiceImportPage = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const canImport = canEditInvoices(user?.role);

  const validRows = useMemo(() => preview.filter((row) => row.valid).length, [preview]);
  const invalidRows = preview.length - validRows;
  const currentStep = result ? 'result' : preview.length ? 'preview' : 'upload';
  const canCommit = canImport && preview.length > 0 && invalidRows === 0 && !committing;

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
    setPreview([]);
    setResult(null);
    setError(null);
  };

  const handlePreview = async () => {
    if (!file || !activeCompany) {
      return;
    }
    setPreviewing(true);
    setError(null);
    setResult(null);
    try {
      const data = await invoicesAPI.previewImport({ file, companyId: activeCompany.id });
      setPreview(Array.isArray(data.preview) ? data.preview : []);
    } catch (previewError) {
      setPreview([]);
      setError(formatApiError(previewError, 'Unable to preview invoice import.'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!file || !activeCompany || !canCommit) {
      return;
    }
    setCommitting(true);
    setError(null);
    try {
      const data = await invoicesAPI.commitImport({ file, companyId: activeCompany.id });
      setResult(data);
    } catch (commitError) {
      setError(formatApiError(commitError, 'Unable to import invoices.'));
    } finally {
      setCommitting(false);
    }
  };

  if (!activeCompany) {
    return (
      <EmptyState
        title="Select a company"
        description="Invoice imports are scoped per company. Choose an active company before importing invoices."
        action={
          <Button variant="primary" onClick={() => navigate('/companies')}>
            Select company
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Invoices</p>
          <h1 className="text-3xl font-bold text-gray-900">Import invoices</h1>
          <p className="text-sm text-gray-500">
            Upload CSV or JSON invoices for {activeCompany.name}. Imported invoices are created as drafts.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/invoices')}>
          Back to invoices
        </Button>
      </div>

      {isReadOnlyRole(user?.role) && (
        <ReadOnlyBanner
          mode={readOnlyBannerMode(user?.role)}
          message="You have read-only access. Invoice import is disabled for your role."
        />
      )}

      <Card>
        <div className="flex flex-wrap gap-2">
          {STEPS.map((step) => {
            const active = step.id === currentStep;
            return (
              <span
                key={step.id}
                className={`rounded border px-3 py-1 text-sm font-medium ${
                  active
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                {step.label}
              </span>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="invoice-import-file">
              Source file
            </label>
            <input
              id="invoice-import-file"
              className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              disabled={!canImport || previewing || committing}
            />
            <p className="mt-2 text-xs text-gray-500">
              CSV files may use an `items` JSON column or single-line item columns: description, quantity,
              unitPrice, vatRate.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={handlePreview}
              disabled={!canImport || !file || previewing || committing}
              loading={previewing}
            >
              Preview and validate
            </Button>
            <Button
              variant="secondary"
              onClick={handleCommit}
              disabled={!canCommit}
              loading={committing}
            >
              Import valid batch
            </Button>
          </div>

          {!canImport && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Your role can view invoices, but importing is restricted to admins and accountants.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.message}
            </div>
          )}
        </div>
      </Card>

      {preview.length > 0 && (
        <Card>
          <div className="space-y-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Validation preview</h2>
                <p className="text-sm text-gray-500">
                  {validRows} valid, {invalidRows} invalid, {preview.length} total rows.
                </p>
              </div>
              {invalidRows > 0 && (
                <span className="rounded bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                  Fix invalid rows before import
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Dates</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2">Messages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row) => (
                    <tr key={row.row}>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.row}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            row.valid
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {row.valid ? 'Valid' : 'Invalid'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.invoice?.clientName || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.invoice?.date || '-'} / {row.invoice?.dueDate || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.invoice?.itemCount ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.valid ? 'Ready to import' : row.errors.join(' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <Card>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Import complete</h2>
            <p className="text-sm text-gray-600">
              Imported {result.importedCount || result.invoices?.length || 0} draft invoices.
            </p>
            <Button variant="primary" onClick={() => navigate('/invoices')}>
              View invoices
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InvoiceImportPage;
