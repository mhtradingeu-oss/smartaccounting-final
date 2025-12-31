import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();
  const displayMessage = message || t('states.error.description');
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[200px] text-red-500"
      role="alert"
      aria-live="assertive"
    >
      <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-lg font-medium">{displayMessage}</span>
      {onRetry && (
        <button
          type="button"
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          onClick={onRetry}
          aria-label={t('common.retry')}
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
