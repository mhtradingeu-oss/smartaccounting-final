import React from 'react';

const STATUS_META = {
  draft: {
    label: 'Draft',
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  },
  issued: {
    label: 'Issued',
    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
  },
  paid: {
    label: 'Paid',
    classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  overdue: {
    label: 'Overdue',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  partially_paid: {
    label: 'Partially paid',
    classes: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  },
};

const InvoiceStatusBadge = ({ status, className = '' }) => {
  const normalizedStatus = String(status || '').toLowerCase();
  const meta = STATUS_META[normalizedStatus] || {
    label: status ? String(status).replace(/_/g, ' ').toUpperCase() : 'Unknown',
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

export default InvoiceStatusBadge;
