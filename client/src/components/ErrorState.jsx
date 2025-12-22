import React from 'react';

export default function ErrorState({ message = 'An error occurred.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-red-500">
      <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-lg font-medium">{message}</span>
      {onRetry && (
        <button
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}
