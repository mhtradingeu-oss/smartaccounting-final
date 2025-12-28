import React from 'react';
import { Card } from './Card';

/**
 * EmptyState component for consistent empty/error/disabled UI states.
 * Props:
 * - icon: React node (optional)
 * - title: string (required)
 * - description: string (required)
 * - action: React node (optional)
 */
/**
 * EmptyState: Consistent, calm empty/disabled/error UI for all main pages.
 * Props:
 * - icon: React node (optional)
 * - title: string (required)
 * - description: string (required)
 * - action: React node (optional)
 * - help: string (optional, extra guidance)
 */
export function EmptyState({ icon, title, description, action, help }) {
  return (
    <Card className="flex flex-col items-center justify-center py-14 text-center bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
      {icon && <div className="mb-5 scale-110 opacity-90">{icon}</div>}
      <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-base text-gray-500 dark:text-gray-400 mb-5 max-w-xl mx-auto">
        {description}
      </p>
      {action && <div className="mt-3">{action}</div>}
      {help && <div className="mt-4 text-xs text-gray-400 max-w-md mx-auto">{help}</div>}
    </Card>
  );
}
