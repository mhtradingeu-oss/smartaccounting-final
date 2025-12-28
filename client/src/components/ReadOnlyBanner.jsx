/**
 * ReadOnlyBanner: Shows a clear, calm explanation for read-only users.
 * Props:
 * - mode: string (optional, e.g. 'Viewer')
 * - message: string (optional, overrides default)
 * - details: string (optional, extra info)
 */
const ReadOnlyBanner = ({ mode = '', message, details }) => (
  <div
    className="bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-900/60 dark:to-gray-900 border border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-200 px-6 py-4 rounded-lg mb-8 text-center shadow-sm"
    role="status"
  >
    <span className="block text-base font-semibold tracking-wide mb-1">
      {mode ? `${mode} Mode:` : 'Read-only:'}
    </span>
    <span className="block text-sm font-medium">
      {message || 'You have view-only access. Actions are disabled for your role.'}
    </span>
    {details && <div className="text-xs text-blue-700 dark:text-blue-300 mt-2">{details}</div>}
    <div className="text-xs text-blue-700 dark:text-blue-300 mt-2">
      To make changes, please contact your administrator or request a higher access role.
    </div>
  </div>
);

export default ReadOnlyBanner;
