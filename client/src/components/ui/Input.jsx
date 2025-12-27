import React from 'react';
import clsx from 'clsx';

import { designTokens } from '../../lib/designTokens';

export const Input = React.forwardRef(
  ({ className = '', error = false, helperText, style, ...props }, ref) => (
    <>
      <input
        ref={ref}
        className={clsx(
          'block w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition',
          error
            ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
            : 'border border-gray-300 focus:border-primary-500 focus:ring-primary-500',
          className,
        )}
        style={{
          borderRadius: designTokens.radius.sm,
          padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
          borderWidth: '1px',
          ...style,
        }}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {helperText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" role="status">
          {helperText}
        </p>
      )}
    </>
  ),
);
Input.displayName = 'Input';
