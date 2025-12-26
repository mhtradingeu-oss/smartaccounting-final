import React from 'react';
import clsx from 'clsx';

export function Modal({ open, onClose, children, className = '', ...props }) {
  if (!open) {
    // Visually hidden for accessibility, avoids blank render
    return <div style={{ display: 'none' }} aria-hidden="true" />;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className={clsx(
          'bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-lg w-full',
          className,
        )}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {children}
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>
    </div>
  );
}
