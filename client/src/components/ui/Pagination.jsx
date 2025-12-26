import React from 'react';
import clsx from 'clsx';

export function Pagination({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) {
    // Visually hidden for accessibility, avoids blank render
    return <nav aria-label="Pagination" className="sr-only" />;
  }
  return (
    <nav className="flex justify-center mt-4" aria-label="Pagination">
      <ul className="inline-flex -space-x-px">
        {Array.from({ length: pageCount }, (_, i) => (
          <li key={i}>
            <button
              className={clsx(
                'px-3 py-1 rounded',
                page === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200',
              )}
              onClick={() => onPageChange(i + 1)}
              aria-current={page === i + 1 ? 'page' : undefined}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
