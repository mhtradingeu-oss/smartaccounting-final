import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

const PlanRestrictedState = ({ feature, upgradePath = '/pricing', message }) => {
  const title = feature ? `${feature} requires an upgrade` : 'Upgrade required';
  const description = message || 'Your current plan does not include this capability.';

  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Link to={upgradePath}>
          <Button variant="primary">View upgrade options</Button>
        </Link>
      }
      help="Upgrade access must be approved by your administrator."
    />
  );
};

export default PlanRestrictedState;
