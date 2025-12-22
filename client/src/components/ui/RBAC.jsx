import React from 'react';
import { isReadOnlyRole } from '../../lib/rbac';

/**
 * RBAC utility for UI: disables or hides children based on user role.
 * Usage: <RBAC role="admin" hide><Button>Admin Only</Button></RBAC>
 * Props:
 * - role: required role (string or array)
 * - userRole: current user role (string)
 * - hide: if true, hides children; else disables them
 * - children: React node(s)
 * - tooltip: optional string for a11y
 */
export function RBAC({ role, userRole, children, tooltip }) {
  // Accepts string or array for role
  const allowed = Array.isArray(role)
    ? role.includes(userRole)
    : userRole === role;

  if (allowed) { return children; }

  // Always disable, never hide, and show reason
  return React.Children.map(children, (child) =>
    React.isValidElement(child)
      ? React.cloneElement(child, {
          disabled: true,
          title:
            tooltip ||
            (isReadOnlyRole(userRole)
              ? 'Read-only: Not permitted for your role'
              : 'You do not have permission for this action'),
          'aria-disabled': true,
        })
      : child,
  );
}
