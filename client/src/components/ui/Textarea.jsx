import React from 'react';
import clsx from 'clsx';

export const Textarea = React.forwardRef(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      'block w-full rounded border border-gray-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
