import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../LoadingSpinner';
import ErrorState from '../ErrorState';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export const PageLoadingState = ({ title, description }) => {
  const { t } = useTranslation();
  const resolvedTitle = title || t('states.loading.title');
  const resolvedDescription = description || t('states.loading.description');
  return (
    <div
      className="flex flex-col items-center justify-center py-12 space-y-3 text-center max-w-sm mx-auto px-4"
      role="status"
      aria-live="polite"
      aria-label={resolvedTitle}
    >
      <LoadingSpinner size="large" label={resolvedTitle} />
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {resolvedTitle}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300 max-w-xs">
        {resolvedDescription}
      </p>
    </div>
  );
};

// Accepts optional title, description, help for custom empty states
export const PageEmptyState = ({ action, title, description, help }) => {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={title || t('states.empty.title')}
      description={description || t('states.empty.description')}
      action={action}
      help={help}
    />
  );
};

export const PageErrorState = ({ onRetry, message, help }) => {
  const { t } = useTranslation();
  const resolvedMessage = message || t('states.error.description');
  const resolvedHelp = help || t('states.error.help');
  return (
    <div className="space-y-3 text-center max-w-sm mx-auto" role="status" aria-live="polite">
      <ErrorState message={resolvedMessage} onRetry={onRetry} />
      <p className="text-xs text-gray-500 dark:text-gray-400">{resolvedHelp}</p>
    </div>
  );
};

export const PageNoAccessState = ({ action }) => {
  const { t } = useTranslation();
  const defaultAction = (
    <Link to="/companies">
      <Button variant="primary" size="md">
        {t('states.no_access.action')}
      </Button>
    </Link>
  );
  return (
    <EmptyState
      title={t('states.no_access.title')}
      description={t('states.no_access.description')}
      action={action || defaultAction}
    />
  );
};
