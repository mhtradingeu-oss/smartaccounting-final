import React from 'react';
import PropTypes from 'prop-types';
import clsx from '../lib/clsx';

const severityStyles = {
  high: {
    chip: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
  medium: {
    chip: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    dot: 'bg-yellow-500',
  },
  low: {
    chip: 'border-green-200 bg-green-50 text-green-700',
    dot: 'bg-green-500',
  },
  unknown: {
    chip: 'border-gray-200 bg-gray-50 text-gray-600',
    dot: 'bg-gray-400',
  },
};

export default function AISeverityPill({ severity = 'unknown', className = '' }) {
  const normalized = (severity || 'unknown').toLowerCase();
  const style = severityStyles[normalized] || severityStyles.unknown;
  const label =
    normalized === 'unknown' ? 'Unknown' : `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        style.chip,
        className,
      )}
      aria-label={`Severity: ${label}`}
    >
      <span className={clsx('h-2 w-2 rounded-full', style.dot)} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

AISeverityPill.propTypes = {
  severity: PropTypes.string,
  className: PropTypes.string,
};
