import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../LoadingSpinner';
import ErrorState from '../ErrorState';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export const PageLoadingState = () => {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col items-center justify-center py-12 space-y-3 text-center max-w-sm mx-auto px-4"
      role="status"
      aria-live="polite"
      aria-label={t('states.loading.title')}
    >
      <LoadingSpinner size="large" label={t('states.loading.title')} />
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('states.loading.title')}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300 max-w-xs">{t('states.loading.description')}</p>
    </div>
  );
};

export const PageEmptyState = ({ action }) => {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('states.empty.title')}
      description={t('states.empty.description')}
      action={action}
    />
  );
};

export const PageErrorState = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <div
      className="space-y-3 text-center max-w-sm mx-auto"
      role="status"
      aria-live="polite"
    >
      <ErrorState message={t('states.error.description')} onRetry={onRetry} />
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('states.error.help')}</p>
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
