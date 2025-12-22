import React from 'react';
import clsx from 'clsx';

export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-lg bg-white dark:bg-gray-900 shadow p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
