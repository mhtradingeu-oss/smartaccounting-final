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
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  },
};

const InvoiceStatusBadge = ({ status, className = '' }) => {
  const meta = STATUS_META[status] || {
    label: status ? status.toUpperCase() : 'Unknown',
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
