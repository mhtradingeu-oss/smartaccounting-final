/**
 * ReadOnlyBanner: Shows a clear, calm explanation for read-only users.
 * Props:
 * - mode: string (optional, e.g. 'Viewer')
 * - message: string (optional, overrides default)
 * - details: string (optional, extra info)
 */
import { useTranslation } from 'react-i18next';

const ReadOnlyBanner = ({ mode = '', message, details }) => {
  const { t } = useTranslation();
  // Always show 'Read-only (Audit Mode)' for auditor/viewer roles
  const label = mode ? `${mode} (Audit Mode):` : t('states.read_only.label');
  const bodyMessage = message || t('states.read_only.default_message');
  const detailCopy = details || t('states.read_only.details');

  // Advisory-only explanation for AI features
  const advisoryExplanation = (
    <div className="text-xs text-yellow-800 dark:text-yellow-200 mt-2">
      <strong>Advisory Only:</strong> AI features in this system are strictly read-only for your
      safety and compliance. No actions, changes, or transactions can be executed by AI. All
      responses are for informational purposes only, and every interaction is logged for audit. This
      ensures AI is helpful, never authoritative or dangerous.
    </div>
  );

  return (
    <section
      className="bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-900/60 dark:to-gray-900 border border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-200 px-6 py-4 rounded-lg mb-8 text-center shadow-sm"
      role="status"
      aria-label="Read-only advisory banner"
      aria-live="polite"
      tabIndex={0}
    >
      <span className="block text-base font-semibold tracking-wide mb-1">{label}</span>
      <span className="block text-sm font-medium">{bodyMessage}</span>
      {details && <div className="text-xs text-blue-700 dark:text-blue-300 mt-2">{details}</div>}
      <div className="text-xs text-blue-700 dark:text-blue-300 mt-2">{detailCopy}</div>
      {advisoryExplanation}
    </section>
  );
};

export default ReadOnlyBanner;
