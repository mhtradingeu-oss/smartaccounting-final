import React, { Suspense, lazy } from 'react';
import { PageLoadingState } from './PageStates';

const isTest =
  import.meta?.env?.MODE === 'test' || process.env.NODE_ENV === 'test';

let ModalComponent;

if (isTest) {
  const module = await import('./Modal');
  ModalComponent = module.Modal;
} else {
  ModalComponent = lazy(() => import('./Modal'));
}

export default function AsyncModal({ open, ...rest }) {
  if (!open) {
    return null;
  }

  if (isTest) {
    return <ModalComponent open={open} {...rest} />;
  }

  return (
    <Suspense fallback={<PageLoadingState />}>
      <ModalComponent open={open} {...rest} />
    </Suspense>
  );
}
