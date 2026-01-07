import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Breadcrumbs component for navigation hierarchy.
 * @param {Array<{ label: string, to?: string }>} items - Array of breadcrumb items.
 * The last item is considered the current page and is not a link.
 */
export default function Breadcrumbs({ items }) {
  return (
    <nav className="text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
      <ol className="flex space-x-2">
        {items.map((item, idx) => (
          <li key={item.label} className="flex items-center">
            {item.to && idx !== items.length - 1 ? (
              <Link to={item.to} className="hover:underline text-blue-600">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-gray-700">{item.label}</span>
            )}
            {idx < items.length - 1 && <span className="mx-2">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

Breadcrumbs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string,
    }),
  ).isRequired,
};
