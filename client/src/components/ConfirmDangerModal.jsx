import React, { useId } from 'react';

export default function ConfirmDangerModal({
  title,
  message,
  confirmText = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = `${titleId}-description`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="presentation"
      aria-hidden="false"
    >
      <div
        className="bg-white rounded shadow-lg max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <h2
          id={titleId}
          className={`text-xl font-bold mb-2 ${danger ? 'text-red-600' : 'text-gray-900'}`}
        >
          {title}
        </h2>
        <p id={descriptionId} className="mb-4 text-gray-700">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={onCancel}
            disabled={loading}
            aria-disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={onConfirm}
            disabled={loading}
            aria-disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
