import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

const FeatureGate = ({
  enabled,
  featureName,
  description,
  help,
  action,
  ctaLabel = 'Return to dashboard',
  ctaPath = '/dashboard',
  children,
}) => {
  if (enabled) {
    return <>{children}</>;
  }

  const fallbackAction = action ?? (
    <Link to={ctaPath}>
      <Button variant="primary">{ctaLabel}</Button>
    </Link>
  );

  return (
    <EmptyState
      title={`${featureName} unavailable`}
      description={
        description ||
        `${featureName} is currently disabled. Check back later or contact your administrator for updates.`
      }
      action={fallbackAction}
      help={help}
    />
  );
};

export default FeatureGate;
