import React from 'react';
import clsx from 'clsx';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
        className,
      )}
      {...props}
    />
  );
}
