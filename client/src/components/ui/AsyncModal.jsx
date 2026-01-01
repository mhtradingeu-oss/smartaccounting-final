import React, { Suspense, lazy } from 'react';
import { PageLoadingState } from './PageStates';
import { Modal as ModalSync } from './Modal';

// Compile-time friendly test detection
const isTest =
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.VITEST === 'true' || import.meta.env?.MODE === 'test');

// Lazy modal for production only
const ModalLazy = lazy(() =>
  import('./Modal').then((m) => ({
    default: m.Modal,
  })),
);

export default function AsyncModal(props) {
  const Modal = isTest ? ModalSync : ModalLazy;

  // In tests: render synchronously (no Suspense, no lazy)
  if (isTest) {
    return <Modal {...props} />;
  }

  // In production: lazy + Suspense
  return (
    <Suspense fallback={<PageLoadingState />}>
      <Modal {...props} />
    </Suspense>
  );
}
