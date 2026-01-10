import { useMemo, useState } from 'react';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { isReadOnlyRole } from '../lib/permissions';
import { isOCRPreviewEnabled } from '../lib/featureFlags';
import { previewDocument, processDocument } from '../services/ocrAPI';
import FeatureGate from '../components/FeatureGate';
import { PageNoAccessState } from '../components/ui/PageStates';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'tiff'];
const ALLOWED_EXTENSIONS_LABEL = 'PDF, JPG, JPEG, PNG, TIFF';

const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'bank_statement', label: 'Bank statement' },
  { value: 'tax_document', label: 'Tax document' },
];

const DOCUMENT_TYPE_LABELS = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  bank_statement: 'Bank statement',
  tax_document: 'Tax document',
};

const SUPPORTED_MIME_HINT = 'PDF & high-resolution images (JPEG, PNG, TIFF)';

const formatFieldLabel = (key) => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatFieldValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
};

const formatConfidence = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
};

const OCRPreview = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const companyName = activeCompany?.name || 'Company';
  const activeCompanyId = activeCompany?.id ?? null;
  const isReadOnlySession = isReadOnlyRole(user?.role);
  const ocrPreviewEnabled = isOCRPreviewEnabled();

  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0].value);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState(0);
  const [previewResponse, setPreviewResponse] = useState(null);
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [processConfirmed, setProcessConfirmed] = useState(false);
  const [processStatus, setProcessStatus] = useState('idle');
  const [processError, setProcessError] = useState('');
  const [processResult, setProcessResult] = useState(null);

  const previewTypeLabel = useMemo(() => {
    const responseType = previewResponse?.type;
    return DOCUMENT_TYPE_LABELS[responseType] || DOCUMENT_TYPE_LABELS[documentType];
  }, [previewResponse, documentType]);
  const compliance = previewResponse?.analysis?.compliance;
  const complianceStatus = compliance?.status || 'unknown';
  const complianceLabel = complianceStatus.replace(/_/g, ' ');
  const complianceMeta = {
    accepted: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    needs_review: 'border-amber-200 bg-amber-50/70 text-amber-900',
    rejected: 'border-rose-200 bg-rose-50/70 text-rose-900',
    draft: 'border-gray-200 bg-gray-50 text-gray-700',
    unknown: 'border-gray-200 bg-gray-50 text-gray-700',
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setFileError('');
    setPreviewResponse(null);
    setSelectedFile(null);
    setSelectedFileName('');
    setSelectedFileSize(0);
    setProcessConfirmed(false);
    setProcessStatus('idle');
    setProcessError('');
    setProcessResult(null);

    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      setFileError(`Unsupported format. ${ALLOWED_EXTENSIONS_LABEL} files only.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('Please select a document smaller than 25 MB.');
      return;
    }

    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
    setSelectedFile(file);
    setReading(true);

    try {
      const response = await previewDocument(file, documentType, activeCompanyId);
      setPreviewResponse(response);
    } catch (error) {
      setFileError('The preview could not be generated. Please try again later.');
    } finally {
      setReading(false);
    }
  };

  const handleProcessDocument = async () => {
    if (!selectedFile || !processConfirmed || reading || processStatus === 'processing') {
      return;
    }
    setProcessStatus('processing');
    setProcessError('');
    try {
      const response = await processDocument(selectedFile, documentType, activeCompanyId);
      setProcessResult(response);
      setProcessStatus('done');
    } catch (error) {
      setProcessError('Processing failed. Please review the file and try again.');
      setProcessStatus('error');
    }
  };

  const renderWarnings = () => {
    const warnings = previewResponse?.warnings || [];
    if (!warnings.length) {
      return <p className="text-sm text-gray-500">No warnings detected.</p>;
    }
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    );
  };

  const renderExplanations = () => {
    const explanations = previewResponse?.explanations || [];
    if (!explanations.length) {
      return <p className="text-sm text-gray-500">No explanations provided.</p>;
    }
    return (
      <ul className="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
        {explanations.map((explanation) => (
          <li key={explanation}>{explanation}</li>
        ))}
      </ul>
    );
  };

  const renderFields = () => {
    const fields = previewResponse?.fields || {};
    const entries = Object.entries(fields);
    if (!entries.length) {
      return <p className="text-sm text-gray-500">No structured fields detected yet.</p>;
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex flex-col rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="text-xs uppercase tracking-wider text-gray-500">
              {formatFieldLabel(key)}
            </span>
            <span className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {formatFieldValue(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (!activeCompanyId) {
    return <PageNoAccessState />;
  }

  return (
    <FeatureGate
      enabled={ocrPreviewEnabled}
      featureName="OCR preview"
      description="Enable OCR_PREVIEW_ENABLED to use the read-only document preview."
      ctaLabel="Back to bank statements"
      ctaPath="/bank-statements"
    >
      <div className="space-y-6">
        <ReadOnlyBanner
          message="No data has been saved"
          details="OCR preview is read-only. Nothing is persisted during this dry run."
        />

        <section className="rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {companyName}
              </p>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">OCR Preview</h1>
              <p className="text-sm text-gray-500">
                Upload a document to see how the OCR engine classifies fields, highlights
                confidence, and explains how results were derived. This mode does not modify your
                data.
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <span className="block">Preview only · No data has been saved.</span>
              <span className="block font-semibold text-gray-900 dark:text-white">
                {isReadOnlySession ? 'Viewer safe' : 'Read-only ready'}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step 1 · Upload for preview
              </p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select document for OCR analysis
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              Supported formats: {ALLOWED_EXTENSIONS_LABEL} · Max 25 MB
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label
              htmlFor="ocr-preview-input"
              className="flex h-12 cursor-pointer items-center justify-between rounded-xl border border-gray-300 bg-gray-50 px-4 text-sm font-medium text-gray-700 transition hover:border-primary-500 hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <span>{reading ? 'Uploading…' : 'Choose a file'}</span>
              <span className="text-xs text-gray-500">{SUPPORTED_MIME_HINT}</span>
              <input
                id="ocr-preview-input"
                type="file"
                accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
                className="hidden"
                onChange={handleFileChange}
                disabled={reading}
              />
            </label>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="ocr-document-type"
                className="text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Document type
              </label>
              <select
                id="ocr-document-type"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:ring focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                disabled={reading}
              >
                {DOCUMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Pick the document type you want the preview to assume.
              </p>
            </div>
          </div>

          {fileError && <p className="text-sm font-medium text-rose-600">{fileError}</p>}
          {selectedFileName && (
            <p className="text-sm text-gray-500">
              Selected: {selectedFileName} · {(selectedFileSize / 1024).toFixed(1)} KB
            </p>
          )}
        </section>

        <section className="space-y-6 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                OCR intelligence
              </p>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {previewTypeLabel} breakdown
              </h3>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="text-xs text-gray-500">Confidence score</span>
              <span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
                {formatConfidence(previewResponse?.confidence)}
              </span>
            </div>
          </div>

          {previewResponse ? (
            <>
              <div className="space-y-4">{renderFields()}</div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-green-200 bg-green-50/60 p-4 text-sm text-green-900 dark:border-green-700 dark:bg-green-900/40 dark:text-green-200">
                  <p className="text-xs uppercase tracking-wide text-green-700 dark:text-green-200">
                    Warnings
                  </p>
                  {renderWarnings()}
                </div>
                <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
                  <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-100">
                    Explanations
                  </p>
                  {renderExplanations()}
                </div>
              </div>

              {compliance && (
                <div
                  className={`rounded-xl border p-4 text-sm ${complianceMeta[complianceStatus] || complianceMeta.unknown}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide">Compliance</p>
                    <span className="text-xs font-semibold uppercase">{complianceLabel}</span>
                  </div>
                  {compliance.errors?.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {compliance.errors.map((item, idx) => (
                        <li key={`err-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {compliance.warnings?.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {compliance.warnings.map((item, idx) => (
                        <li key={`warn-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {compliance.recommendations?.length > 0 && (
                    <p className="mt-3 text-xs">
                      {compliance.recommendations.join(' ')}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                <p className="text-xs uppercase tracking-wide text-gray-500">Raw OCR text</p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                  {previewResponse.rawText || 'No text was extracted.'}
                </pre>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Upload a document to see the structured preview.
            </p>
          )}

          <p className="text-xs text-gray-500">
            Preview data is read-only until you confirm a saved analysis below.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step 2 · Save and analyze
              </p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Persist OCR results for review
              </h2>
              <p className="text-sm text-gray-500">
                Uploads are stored as draft records. Nothing is posted without explicit confirmation.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Manual approval required
            </span>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={processConfirmed}
              onChange={(event) => setProcessConfirmed(event.target.checked)}
              disabled={isReadOnlySession || reading}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            I understand this will store the document and mark it for review.
          </label>

          {processError && (
            <p className="text-sm font-medium text-rose-600">{processError}</p>
          )}

          <button
            type="button"
            onClick={handleProcessDocument}
            disabled={!previewResponse || !processConfirmed || isReadOnlySession || reading}
            className="btn-primary"
          >
            {processStatus === 'processing' ? 'Processing…' : 'Save OCR results'}
          </button>

          {processResult?.analysis?.compliance && (
            <p className="text-sm text-gray-500">
              Status: {processResult.analysis.compliance.status.replace(/_/g, ' ')}
            </p>
          )}
        </section>
      </div>
    </FeatureGate>
  );
};

export default OCRPreview;
