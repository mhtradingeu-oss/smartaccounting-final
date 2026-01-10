import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import BankStatementStatusBadge from '../components/BankStatementStatusBadge';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { PageEmptyState } from '../components/ui/PageStates';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { bankStatementsAPI, inferFormat } from '../services/bankStatementsAPI';
import { formatApiError } from '../services/api';
import { can } from '../lib/permissions';

const ALLOWED_EXTENSIONS = ['csv', 'txt', 'xml', 'mt940', 'camt053', 'pdf', 'png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BANK_STATEMENT_REFRESH_EVENT = 'bankStatements:refresh';

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const validateFile = (file) => {
  if (!file) {
    return 'Please select a bank statement file.';
  }

  const extension = file.name?.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `Only ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()} files are allowed.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File exceeds the 10 MB upload limit.';
  }

  return null;
};

const BankStatementImport = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const canImport = useMemo(() => can('bank:write', user?.role), [user?.role]);
  const selectedFormat = useMemo(() => inferFormat(selectedFile?.name || ''), [selectedFile]);

  if (!activeCompany) {
    return (
      <PageEmptyState
        title="Select a company to import statements"
        description="Bank statements are scoped per company. Choose one before uploading."
        action={
          <Link
            to="/companies"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            Select company
          </Link>
        }
      />
    );
  }

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
    setError(null);
    setStatus('idle');
    setResult(null);
    setConfirmationChecked(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canImport) {
      setError({ message: 'You do not have permission to import bank statements.' });
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError({ message: validationError });
      return;
    }

    if (!confirmationChecked) {
      setError({ message: 'Please confirm that you understand this will write to your company data.' });
      return;
    }

    setStatus('uploading');
    setError(null);
    setResult(null);

    try {
      const payload = await bankStatementsAPI.upload(selectedFile);
      if (!payload?.success) {
        throw new Error(payload?.message || 'Import failed');
      }

      const importResult = payload.data;
      setResult(importResult);
      setStatus('success');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BANK_STATEMENT_REFRESH_EVENT));
      }
    } catch (uploadError) {
      setStatus('error');
      setError(formatApiError(uploadError, 'Unable to import bank statement.'));
    }
  };

  const summary = result?.summary;
  const importedTransactions = summary?.totalImported ?? result?.transactions?.length ?? 0;
  const processedTransactions = summary?.totalProcessed ?? result?.transactions?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-6 py-4 text-sm text-amber-900 shadow-sm">
        <p className="font-semibold">Import will save data to the server.</p>
        <p className="text-xs text-amber-800 mt-1">
          This is a write operation. Please confirm below before you upload a bank statement.
        </p>
      </div>
      {!canImport && (
        <ReadOnlyBanner message="Your role does not allow importing bank statements." />
      )}

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company</p>
          <h1 className="text-3xl font-bold text-gray-900">{activeCompany.name}</h1>
          <p className="text-sm text-gray-500">Controlled import flow</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700">
            Bank statement file
          </label>
          <input
            type="file"
            accept=".csv,.txt,.xml,.mt940,.camt053,.pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
            disabled={!canImport || status === 'uploading'}
          />
          <p className="text-xs text-gray-500">
            Allowed formats: CSV, MT940, CAMT053, PDF, PNG, JPG. Max size: 10 MB.
          </p>
          {selectedFormat === 'OCR' && (
            <p className="text-xs text-amber-600">
              OCR imports capture statement metadata but require manual review before posting.
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <input
            id="confirm-import"
            type="checkbox"
            checked={confirmationChecked}
            onChange={(event) => setConfirmationChecked(event.target.checked)}
            disabled={!canImport || status === 'uploading'}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="confirm-import" className="text-sm text-gray-700">
            I understand this will import statement data into my company records.
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            type="submit"
            disabled={
              !canImport ||
              !selectedFile ||
              !confirmationChecked ||
              status === 'uploading'
            }
            className="min-w-[220px]"
            title={
              !canImport
                ? 'You do not have permission to import bank statements.'
                : !selectedFile
                ? 'Choose a file before importing.'
                : !confirmationChecked
                ? 'Confirm before importing.'
                : undefined
            }
          >
            {status === 'uploading' ? 'Uploading…' : 'Import bank statement'}
          </Button>
          <Button
            variant="outline"
            size="medium"
            onClick={() => navigate('/bank-statements')}
            disabled={status === 'uploading'}
          >
            Back to bank statements
          </Button>
        </div>
      </form>

      {status === 'uploading' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Uploading {selectedFile?.name || 'your file'}… please do not close this window.
        </div>
      )}

      {status === 'success' && result?.bankStatement && (
        <div className="space-y-4 rounded-lg border border-green-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">Import successful</p>
              <p className="text-lg font-bold text-gray-900">
                {result.bankStatement.fileName || 'Bank statement'}
              </p>
            </div>
            <BankStatementStatusBadge status={result.bankStatement.status} />
          </div>

          <dl className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-gray-500">Imported file</dt>
              <dd>{result.bankStatement.fileName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Timestamp</dt>
              <dd>{formatDateTime(result.bankStatement.importDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Status</dt>
              <dd>{result.bankStatement.status}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-gray-500">Transactions created</p>
              <p className="text-lg font-semibold text-gray-900">
                {importedTransactions.toLocaleString('de-DE')}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Processed</p>
              <p className="text-lg font-semibold text-gray-900">
                {processedTransactions.toLocaleString('de-DE')}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Transactions available</p>
              <p className="text-sm text-gray-500">
                {result.transactions?.length ?? 0} entries captured for review.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="medium"
              onClick={() => {
                if (result.bankStatement?.id) {
                  navigate(`/bank-statements/${result.bankStatement.id}`, {
                    state: { statement: result.bankStatement },
                  });
                }
              }}
            >
              View imported statement
            </Button>
            <Button variant="outline" size="medium" onClick={() => navigate('/bank-statements')}>
              Back to statements
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankStatementImport;
