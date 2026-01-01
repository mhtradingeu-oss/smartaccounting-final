import React, { Suspense, lazy } from 'react';
import { PageLoadingState } from './PageStates';

const LazyModal = lazy(() => import('./Modal').then((m) => ({ default: m.Modal })));

export default function AsyncModal(props) {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <LazyModal {...props} />
    </Suspense>
  );
}
