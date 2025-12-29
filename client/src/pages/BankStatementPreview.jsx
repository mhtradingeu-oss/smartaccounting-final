import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { bankStatementsAPI, inferFormat } from '../services/bankStatementsAPI';
import { formatApiError } from '../services/api';
import { isReadOnlyRole } from '../lib/permissions';
import { isBankImportEnabled } from '../lib/featureFlags';
import { formatCurrency, formatDate } from '../lib/utils/formatting';

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const READ_ONLY_BANNER_MESSAGE = 'Preview only – no data has been saved.';

const formatDateRangeLabel = (range) => {
  if (!range?.from || !range?.to) {
    return '—';
  }
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
};

const formatAmount = (value, currency = 'EUR') => {
  if (value === null || value === undefined) {
    return '—';
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '—';
  }
  return formatCurrency(numberValue, currency);
};

const BankStatementPreview = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const companyName = activeCompany?.name ?? 'Company';
  const isReadOnlySession = isReadOnlyRole(user?.role);
  const bankImportEnabled = isBankImportEnabled();

  const [fileError, setFileError] = useState('');
  const [fileName, setFileName] = useState('');
  const [detectedFormat, setDetectedFormat] = useState('');
  const [previewResponse, setPreviewResponse] = useState(null);
  const [reading, setReading] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const matches = previewResponse?.matches ?? [];
  const unmatched = previewResponse?.unmatched ?? [];
  const warnings = previewResponse?.warnings ?? [];
  const summary = previewResponse?.summary;
  const confirmationToken = previewResponse?.confirmationToken;

  const previewReady = Boolean(previewResponse);
  const statusLabel = reading
    ? 'Backend dry-run in progress…'
    : previewReady
    ? 'Preview ready'
    : 'Waiting for upload';
  const confirmButtonDisabled =
    !previewReady ||
    !confirmationToken ||
    !confirmationChecked ||
    confirming ||
    isReadOnlySession;
  const dateRangeLabel = formatDateRangeLabel(summary?.dateRange);
  const currencyLabel = summary?.currency || 'EUR';
  const supportedFormatsLabel = 'CSV, MT940, CAMT053 (XML)';

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setFileError('');
    setPreviewResponse(null);
    setDetectedFormat('');
    setFileName('');
    setConfirmationChecked(false);
    setConfirmError(null);
    setConfirming(false);

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('Die Datei darf maximal 12 MB groß sein.');
      return;
    }

    const format = inferFormat(file.name);
    if (!format) {
      setFileError('Bitte wähle eine CSV-, MT940- oder CAMT053-Datei aus.');
      return;
    }

    setFileName(file.name);
    setDetectedFormat(format);
    setReading(true);

    try {
      const response = await bankStatementsAPI.previewDryRun(file);
      setPreviewResponse(response);
    } catch (error) {
      const formatted = formatApiError(
        error,
        'Die Vorschau konnte nicht geladen werden. Bitte versuche es erneut.',
      );
      setFileError(formatted.message);
    } finally {
      setReading(false);
    }
  };

  const handleConfirm = async () => {
    if (confirming) {
      return;
    }

    if (!confirmationToken) {
      setConfirmError({
        message: 'Bestätigungstoken fehlt. Bitte führe die Vorschau erneut aus.',
      });
      return;
    }

    setConfirmError(null);
    setConfirming(true);

    try {
      const payload = await bankStatementsAPI.confirmImport(confirmationToken);
      const result = payload?.data ?? payload;
      const bankStatementId = result?.bankStatementId;

      if (!bankStatementId) {
        throw new Error('Bank statement ID is missing from the confirmation response.');
      }

      const detailSummary = result?.summary;
      setConfirming(false);

      navigate(`/bank-statements/${bankStatementId}`, {
        state: {
          statement: {
            id: bankStatementId,
            fileName: fileName || undefined,
            status: 'PROCESSING',
            summary: detailSummary,
          },
        },
        replace: true,
      });
    } catch (error) {
      const formatted = formatApiError(
        error,
        'Die Bestätigung konnte nicht verarbeitet werden. Bitte versuche es erneut.',
      );
      setConfirmError(formatted);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <ReadOnlyBanner message={READ_ONLY_BANNER_MESSAGE} />

      <section className="rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {companyName}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Preview bank statement
            </h1>
            <p className="text-sm text-gray-500">
              The selected file is validated and matched by the backend dry-run route. No data is
              saved or imported yet.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <span className="block">Preview only – no data has been saved.</span>
            <span className="block font-semibold text-gray-900 dark:text-white">
              Server dry-run enabled
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Step 1 · Upload preview file
            </p>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              File picker for server dry-run
            </h2>
            <p className="text-sm text-gray-500">
              Supported formats are {supportedFormatsLabel} and files are checked by the backend
              before any import logic runs.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">
            Preview only
          </span>
        </div>

        <div className="space-y-3">
          <label
            htmlFor="bank-statement-preview-input"
            className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-primary-400 bg-primary-50/40 px-4 py-6 text-primary-700 transition hover:border-primary-500 hover:bg-primary-50 dark:border-primary-400 dark:bg-primary-900 dark:text-primary-300"
          >
            <span className="text-sm font-semibold">Select a bank statement file</span>
            <span className="text-xs text-primary-900 dark:text-primary-200">
              Files must be under 12 MB. The server inspects structure, matches, and warns you where
              something needs attention.
            </span>
            <input
              id="bank-statement-preview-input"
              type="file"
              accept=".csv,.txt,.mt940,.xml"
              className="sr-only"
              onChange={handleFileChange}
              disabled={reading}
            />
          </label>
          {fileError && (
            <p className="text-sm font-semibold text-red-600" role="alert">
              {fileError}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Supported formats: {supportedFormatsLabel}. File size limit: 12 MB.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">File name</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {fileName || 'No file selected yet'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Detected format
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {detectedFormat || 'Awaiting file'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{statusLabel}</p>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-yellow-300 bg-yellow-50 px-6 py-4 text-yellow-900 dark:border-yellow-500 dark:bg-yellow-900/10">
        <p className="font-semibold">Preview only – no data has been imported yet</p>
        <p className="text-sm text-yellow-900 dark:text-yellow-100">
          The backend dry-run validates the file, suggests ledger matches, flags invalid rows, and
          reports warnings. Nothing changes on the server until the real import is confirmed.
        </p>
      </div>

      {previewReady ? (
        <>
          <section className="space-y-6 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Step 2 · Review preview
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Server summary
                </h2>
                <p className="text-sm text-gray-500">
                  These counts come straight from the dry-run response.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Transactions detected
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {summary?.transactionsDetected?.toLocaleString('de-DE') ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Valid transactions
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {summary?.validTransactions?.toLocaleString('de-DE') ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Invalid transactions
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {summary?.invalidTransactions?.toLocaleString('de-DE') ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Currency
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{currencyLabel}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date range</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{dateRangeLabel}</p>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Matches with explanations
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Suggested ledger matches
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                {matches.length} match{matches.length === 1 ? '' : 'es'} suggested
              </p>
            </div>

            {matches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-sm text-gray-600">
                The dry-run did not find any ledger transactions that match this statement yet.
              </p>
            ) : (
              <div className="space-y-4">
                {matches.map((match, index) => (
                  <div
                    key={`match-${index}`}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Match #{index + 1}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {match.bankTransaction?.description || 'Bank transaction'}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatAmount(match.bankTransaction?.amount, currencyLabel)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{match.explanation}</p>
                    {match.ledgerTransaction && (
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500">
                        <span>
                          Ledger: {match.ledgerTransaction.description || 'Ledger entry'}
                        </span>
                        <span>
                          {match.ledgerTransaction.transactionDate
                            ? formatDate(match.ledgerTransaction.transactionDate)
                            : '—'}
                        </span>
                        <span>
                          Amount:{' '}
                          {formatAmount(
                            match.ledgerTransaction.amount,
                            match.ledgerTransaction.currency || currencyLabel,
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Unmatched transactions
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Transactions that still need attention
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                {unmatched.length} transaction{unmatched.length === 1 ? '' : 's'} unmatched
              </p>
            </div>

            {unmatched.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-sm text-gray-600">
                Every validated transaction already has a ledger match in the current search window.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:border-gray-700">
                {unmatched.map((item, index) => (
                  <li
                    key={`unmatched-${index}`}
                    className="flex flex-wrap items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.transaction?.description || 'Unmatched transaction'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.reason || 'No reason provided'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-900 dark:text-white">
                      <p>{formatAmount(item.transaction?.amount, currencyLabel)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.transaction?.transactionDate
                          ? formatDate(item.transaction.transactionDate)
                          : '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Warnings and validation errors
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Issues flagged during the dry-run
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                {warnings.length} warning{warnings.length === 1 ? '' : 's'}
              </p>
            </div>

            {warnings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-sm text-gray-600">
                No validation warnings were emitted for this file.
              </p>
            ) : (
              <ul className="space-y-3">
                {warnings.map((warning, index) => (
                  <li
                    key={`warning-${index}`}
                    className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-500 dark:bg-orange-900/10 dark:text-orange-100"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold">{warning.message}</p>
                      <span className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                        Row {warning.row ?? '—'}
                      </span>
                    </div>
                    {warning.errors?.length ? (
                      <p className="mt-1 text-xs text-orange-900 dark:text-orange-200">
                        Errors: {warning.errors.join(', ')}
                      </p>
                    ) : null}
                    {warning.transaction?.description ? (
                      <p className="mt-1 text-xs text-orange-900 dark:text-orange-200">
                        Transaction: {warning.transaction.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Step 3 · Confirm import
                </p>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Finalize the real import
                </h2>
                <p className="text-sm text-gray-500">
                  Everything below runs only once the dry-run preview is approved. No data is persisted until you confirm, and every import is permanent.
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                Final step
              </span>
            </div>

            <div className="space-y-3">
              {confirmError && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {confirmError.message}
                </div>
              )}
              <label
                htmlFor="confirm-bank-import"
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm dark:border-gray-700 dark:bg-indigo-900/20"
              >
                <input
                  id="confirm-bank-import"
                  type="checkbox"
                  checked={confirmationChecked}
                  onChange={(event) => setConfirmationChecked(event.target.checked)}
                  disabled={!bankImportEnabled || confirming}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    I understand this action imports the statement permanently and cannot be undone.
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                    The backend only executes the real import after this confirmation and never bypasses the dry-run.
                  </p>
                </div>
              </label>

              {bankImportEnabled ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleConfirm}
                  loading={confirming}
                  disabled={confirmButtonDisabled}
                  title={
                    isReadOnlySession
                      ? 'Read-only roles cannot confirm bank imports.'
                      : 'Confirmed imports are permanent and trigger real changes.'
                  }
                >
                  Confirm import
                </Button>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Bank import is currently disabled via feature flag. Reach out to your administrator to enable this action.
                </div>
              )}

              {isReadOnlySession && bankImportEnabled && (
                <p className="text-xs text-gray-500">
                  Your role can only review previews and cannot finalize imports.
                </p>
              )}

              <p className="text-xs text-gray-500">
                Once confirmed, the import is irreversible. Review every warning and match before proceeding.
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-3 rounded-2xl border border-dashed border-gray-200 px-6 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <p>Select a bank statement file to trigger the dry-run preview.</p>
          <p>The backend will return matches, unmatched rows, and warnings without persisting any data.</p>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/bank-statements" className="inline-flex flex-1 min-w-[180px]">
          <Button variant="secondary" size="md">
            Back to bank statements
          </Button>
        </Link>
        <Link
          to="/bank-statements"
          className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          Close preview
        </Link>
      </div>
    </div>
  );
};

export default BankStatementPreview;
