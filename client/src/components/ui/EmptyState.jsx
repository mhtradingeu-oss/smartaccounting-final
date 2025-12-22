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
export function EmptyState({ icon, title, description, action }) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
