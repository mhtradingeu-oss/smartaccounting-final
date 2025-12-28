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

  const tooltip = explainPermission(action, role);
  const child = React.Children.only(children);

  if (React.isValidElement(child)) {
    const combinedClassName = [child.props.className, 'cursor-not-allowed', 'opacity-70']
      .filter(Boolean)
      .join(' ');

    const handleDisabledClick = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    return React.cloneElement(child, {
      disabled: true,
      title: child.props.title || tooltip,
      'aria-disabled': true,
      className: combinedClassName,
      onClick: handleDisabledClick,
    });
  }

  return (
    <span title={tooltip} className="cursor-not-allowed opacity-70">
      {child}
    </span>
  );
}
