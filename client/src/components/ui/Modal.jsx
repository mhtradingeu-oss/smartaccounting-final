import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

import { designTokens } from '../../lib/designTokens';

export function Modal({
  open,
  onClose,
  title,
  children,
  className = '',
  ariaLabel,
  ...props
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const previouslyFocused = document.activeElement;
    containerRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={clsx(
          'relative max-w-2xl w-full bg-white dark:bg-gray-900 shadow-2xl',
          className,
        )}
        style={{
          borderRadius: designTokens.radius.lg,
          boxShadow: designTokens.shadow.base,
          padding: designTokens.spacing.lg,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-label={!title ? ariaLabel : undefined}
        {...props}
      >
        {title && (
          <div className="mb-4">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              {title}
            </h2>
          </div>
        )}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
