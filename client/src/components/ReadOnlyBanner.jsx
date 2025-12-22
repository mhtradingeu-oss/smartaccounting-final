
const ReadOnlyBanner = ({ mode = '', message }) => (
  <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded mb-6 text-center" role="status">
    <strong>{mode ? `${mode} Mode:` : 'Read-only:'}</strong> {message || 'You have read-only access. Editing is disabled.'}
  </div>
);

export default ReadOnlyBanner;
