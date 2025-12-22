import React from 'react';
import clsx from 'clsx';

export function Tag({ className = '', children, color = 'gray', ...props }) {
  const colorMap = {
    gray: 'bg-gray-200 text-gray-800',
    blue: 'bg-blue-200 text-blue-800',
    green: 'bg-green-200 text-green-800',
    red: 'bg-red-200 text-red-800',
    yellow: 'bg-yellow-200 text-yellow-800',
  };
  return (
    <span
      className={clsx(
        'inline-block rounded-full px-3 py-1 text-xs font-medium',
        colorMap[color] || colorMap.gray,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
