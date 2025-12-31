import React, { Suspense, lazy } from 'react';
import { PageLoadingState } from './PageStates';

const ModalImpl = lazy(() => import('./Modal'));

export default function AsyncModal({ open, ...rest }) {
  if (!open) {
    return null;
  }

  return (
    <Suspense fallback={<PageLoadingState />}>
      <ModalImpl open={open} {...rest} />
    </Suspense>
  );
}
