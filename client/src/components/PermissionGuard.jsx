import React from 'react';
import { can, explainPermission } from '../lib/permissions';

/**
 * PermissionGuard component
 * Props:
 * - action: string
 * - role: string
 * - children: ReactNode
 * - fallback: ReactNode (optional, default: disables children with tooltip)
 */
export default function PermissionGuard({ action, role, children, fallback }) {
  if (can(action, role)) {
    return children;
  }
  if (fallback) {
    return fallback;
  }
  // Try to clone and disable the child if possible
  const child = React.Children.only(children);
  let disabledChild = child;
  if (React.isValidElement(child)) {
    // If the child supports 'disabled', set it
    disabledChild = React.cloneElement(child, { disabled: true });
  }
  return (
    <span title={explainPermission(action, role)} style={{ pointerEvents: 'none', opacity: 0.5 }}>
      {disabledChild}
    </span>
  );
}
