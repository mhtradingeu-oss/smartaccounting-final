import React from 'react';
import clsx from 'clsx';

export function Badge({ className = '', children, color = 'gray', ...props }) {
  const colorMap = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span
      className={clsx(
        'inline-block rounded px-2 py-0.5 text-xs font-semibold',
        colorMap[color] || colorMap.gray,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
