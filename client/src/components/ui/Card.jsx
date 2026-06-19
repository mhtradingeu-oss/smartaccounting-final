import React from 'react';
import clsx from 'clsx';

export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
