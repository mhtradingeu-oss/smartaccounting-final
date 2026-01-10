import React from 'react';

const STATUS_META = {
  processing: {
    label: 'Processing',
    classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200',
  },
  needs_review: {
    label: 'Needs review',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  failed: {
    label: 'Failed',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  },
  ready: {
    label: 'Ready',
    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  },
  reconciled: {
    label: 'Reconciled',
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
};

const BankStatementStatusBadge = ({ status, className = '' }) => {
  const key = (status || '').toLowerCase();
  const meta = STATUS_META[key] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown',
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${meta.classes} ${className}`}
    >
      {meta.label}
    </span>
  );
};

export default BankStatementStatusBadge;
