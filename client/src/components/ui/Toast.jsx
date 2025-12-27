import React, { createContext, useContext, useState, useCallback } from 'react';
import clsx from 'clsx';

import { designTokens } from '../../lib/designTokens';

const ToastContext = createContext();
const DEFAULT_DURATION = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast) => {
      const id = toast.id || Date.now();
      const duration = toast.duration ?? DEFAULT_DURATION;
      setToasts((prev) => [...prev, { ...toast, id }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
        style={{ minWidth: 240 }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              'flex items-center justify-between px-4 py-3 rounded-2xl shadow-lg',
              toast.variant === 'warning' && 'bg-amber-50 text-amber-900 border border-amber-200',
              toast.variant === 'danger' && 'bg-red-50 text-red-900 border border-red-200',
              !toast.variant && 'bg-gray-900 text-white',
              toast.variant === 'success' && 'bg-emerald-50 text-emerald-900 border border-emerald-200',
            )}
            role="status"
            style={{
              backgroundColor:
                toast.variant === 'danger'
                  ? '#fee2e2'
                  : toast.variant === 'warning'
                    ? '#fef3c7'
                    : toast.variant === 'success'
                      ? '#ecfccb'
                      : designTokens.colors.surfaceDark,
              color: toast.variant ? undefined : '#f9fafb',
              borderRadius: designTokens.radius.lg,
              boxShadow: designTokens.shadow.base,
            }}
          >
            <span>{toast.message}</span>
            {toast.dismissible !== false && (
              <button
                aria-label="Dismiss notification"
                onClick={() => removeToast(toast.id)}
                className="text-sm font-semibold ml-3 text-primary-600 hover:text-primary-800"
              >
                Dismiss
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
