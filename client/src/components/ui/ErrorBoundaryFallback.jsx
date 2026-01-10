import React from 'react';
import { Card } from './Card';
import { PageErrorState } from './PageStates';

export default function ErrorBoundaryFallback({
  title,
  onRetry,
  actions,
  details,
  fullScreen = true,
}) {
  const content = (
    <Card className="w-full max-w-xl border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl p-6 space-y-6 text-center">
      {title && (
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
          {title}
        </p>
      )}
      <PageErrorState onRetry={onRetry} />
      {actions && <div className="flex flex-col gap-3 items-center">{actions}</div>}
      {details}
    </Card>
  );

  if (!fullScreen) {
    return <div className="flex items-center justify-center px-4 py-16">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      {content}
    </div>
  );
}
