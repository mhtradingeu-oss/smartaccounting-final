import React from 'react';
import clsx from 'clsx';

export function Label({ children, required = false, className = '', ...props }) {
  return (
    <label
      className={clsx('block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-red-500" title="Required">
          *
        </span>
      )}
    </label>
  );
}

export default Label;
